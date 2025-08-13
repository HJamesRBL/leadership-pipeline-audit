export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface EmployeeComparison {
  employeeId: string
  name: string
  email: string
  title: string
  businessUnit: string
  previousStage?: number
  previousPerformance?: number
  currentStage?: number
  currentPerformance?: number
  stageChange?: number // positive = promoted, negative = demoted, 0 = same
  performanceChange?: number // positive = improved, negative = declined
}

interface MovementSummary {
  promoted: number // moved to higher stage
  maintained: number // same stage
  demoted: number // moved to lower stage
  newHires: number // not in previous audit
  departures: number // in previous but not current
  performanceImproved: number
  performanceMaintained: number
  performanceDeclined: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const currentAuditId = searchParams.get('currentId')
    const previousAuditId = searchParams.get('previousId')

    if (!currentAuditId || !previousAuditId) {
      return NextResponse.json(
        { error: 'Both currentId and previousId are required' },
        { status: 400 }
      )
    }

    // Fetch both audits with all related data
    const [currentAudit, previousAudit] = await Promise.all([
      prisma.audit.findUnique({
        where: { id: currentAuditId },
        include: {
          employees: true,
          auditLeaders: {
            include: {
              ratings: {
                include: {
                  employee: true
                }
              }
            }
          }
        }
      }),
      prisma.audit.findUnique({
        where: { id: previousAuditId },
        include: {
          employees: true,
          auditLeaders: {
            include: {
              ratings: {
                include: {
                  employee: true
                }
              }
            }
          }
        }
      })
    ])

    if (!currentAudit || !previousAudit) {
      return NextResponse.json(
        { error: 'One or both audits not found' },
        { status: 404 }
      )
    }

    // Process ratings for both audits
    const processAuditData = (audit: any) => {
      const employeeData = new Map<string, any>()
      
      audit.auditLeaders.forEach((leader: any) => {
        if (leader.completed) {
          const totalEmployeesForLeader = leader.ratings.length
          
          leader.ratings.forEach((rating: any) => {
            if (rating.careerStage > 0 && rating.performanceRank < 999) {
              // Calculate performance percentile
              const convertedRank = totalEmployeesForLeader - rating.performanceRank + 1
              let percentile = 0
              if (totalEmployeesForLeader > 1) {
                percentile = ((convertedRank - 1) / (totalEmployeesForLeader - 1)) * 100
              } else {
                percentile = 100
              }
              
              // Use email as the unique identifier
              const uniqueId = rating.employee.employeeUniqueId || rating.employee.email || rating.employee.name
              
              // Store or average if multiple leaders rated the same employee
              if (employeeData.has(uniqueId)) {
                const existing = employeeData.get(uniqueId)
                existing.careerStage = Math.round((existing.careerStage + rating.careerStage) / 2)
                existing.percentile = (existing.percentile + percentile) / 2
                existing.ratingCount++
              } else {
                employeeData.set(uniqueId, {
                  employeeId: rating.employee.id,
                  uniqueId: uniqueId,
                  name: rating.employee.name,
                  email: rating.employee.employeeUniqueId || rating.employee.email || '',
                  title: rating.employee.title,
                  businessUnit: rating.employee.businessUnit,
                  careerStage: rating.careerStage,
                  percentile: percentile,
                  ratingCount: 1
                })
              }
            }
          })
        }
      })
      
      return employeeData
    }

    // Process both audits
    const previousData = processAuditData(previousAudit)
    const currentData = processAuditData(currentAudit)

    // Compare employees across audits
    const comparisons: EmployeeComparison[] = []
    const movements: MovementSummary = {
      promoted: 0,
      maintained: 0,
      demoted: 0,
      newHires: 0,
      departures: 0,
      performanceImproved: 0,
      performanceMaintained: 0,
      performanceDeclined: 0
    }

    // Track employees found in current audit
    const processedEmployees = new Set<string>()

    // Process employees in current audit
    currentData.forEach((current, uniqueId) => {
      processedEmployees.add(uniqueId)
      const previous = previousData.get(uniqueId)
      
      const comparison: EmployeeComparison = {
        employeeId: current.employeeId,
        name: current.name,
        email: current.email,
        title: current.title,
        businessUnit: current.businessUnit,
        currentStage: current.careerStage,
        currentPerformance: Math.round(current.percentile)
      }
      
      if (previous) {
        // Employee was in previous audit
        comparison.previousStage = previous.careerStage
        comparison.previousPerformance = Math.round(previous.percentile)
        comparison.stageChange = current.careerStage - previous.careerStage
        comparison.performanceChange = Math.round(current.percentile - previous.percentile)
        
        // Track movements
        if (comparison.stageChange! > 0) movements.promoted++
        else if (comparison.stageChange! < 0) movements.demoted++
        else movements.maintained++
        
        // Track performance changes (with 5% threshold for "maintained")
        if (comparison.performanceChange! > 5) movements.performanceImproved++
        else if (comparison.performanceChange! < -5) movements.performanceDeclined++
        else movements.performanceMaintained++
      } else {
        // New hire
        movements.newHires++
      }
      
      comparisons.push(comparison)
    })

    // Process employees who left (in previous but not current)
    previousData.forEach((previous, uniqueId) => {
      if (!processedEmployees.has(uniqueId)) {
        movements.departures++
        comparisons.push({
          employeeId: previous.employeeId,
          name: previous.name,
          email: previous.email,
          title: previous.title,
          businessUnit: previous.businessUnit,
          previousStage: previous.careerStage,
          previousPerformance: Math.round(previous.percentile)
        })
      }
    })

    // Calculate movement patterns for visualization
    const movementPatterns = {
      // Stage transitions (for Sankey diagram)
      transitions: [] as any[],
      // Performance by stage changes
      byStageChange: {
        promoted: [] as any[],
        maintained: [] as any[],
        demoted: [] as any[]
      }
    }

    // Build transition data for Sankey diagram
    const transitionMap = new Map<string, number>()
    comparisons.forEach(comp => {
      if (comp.previousStage && comp.currentStage) {
        const key = `Stage ${comp.previousStage} → Stage ${comp.currentStage}`
        transitionMap.set(key, (transitionMap.get(key) || 0) + 1)
        
        // Categorize by movement type
        if (comp.stageChange! > 0) {
          movementPatterns.byStageChange.promoted.push(comp)
        } else if (comp.stageChange! < 0) {
          movementPatterns.byStageChange.demoted.push(comp)
        } else {
          movementPatterns.byStageChange.maintained.push(comp)
        }
      }
    })

    // Convert transition map to array for visualization
    transitionMap.forEach((count, transition) => {
      const [from, to] = transition.split(' → ')
      movementPatterns.transitions.push({
        from,
        to,
        value: count
      })
    })

    // Calculate ROI metrics
    const roiMetrics = {
      // High potential employees who advanced
      highPotentialAdvanced: comparisons.filter(c => 
        c.previousStage && c.previousStage <= 2 && 
        c.previousPerformance && c.previousPerformance > 75 && 
        c.stageChange && c.stageChange > 0
      ).length,
      
      // At-risk employees who improved
      atRiskImproved: comparisons.filter(c => 
        c.previousStage && c.previousStage >= 3 && 
        c.previousPerformance && c.previousPerformance < 25 && 
        c.performanceChange && c.performanceChange > 10
      ).length,
      
      // Overall talent health score (0-100)
      talentHealthScore: calculateTalentHealth(movements, comparisons),
      
      // Succession readiness improvement
      successionReadiness: {
        previousReady: previousData.size > 0 ? 
          Array.from(previousData.values()).filter((e: any) => e.careerStage >= 3).length : 0,
        currentReady: currentData.size > 0 ? 
          Array.from(currentData.values()).filter((e: any) => e.careerStage >= 3).length : 0
      }
    }

    return NextResponse.json({
      currentAudit: {
        id: currentAudit.id,
        name: currentAudit.name,
        round: currentAudit.auditRound,
        date: currentAudit.createdAt
      },
      previousAudit: {
        id: previousAudit.id,
        name: previousAudit.name,
        round: previousAudit.auditRound,
        date: previousAudit.createdAt
      },
      comparisons,
      movements,
      movementPatterns,
      roiMetrics
    })

  } catch (error) {
    console.error('Error comparing audits:', error)
    return NextResponse.json(
      { error: 'Failed to compare audits' },
      { status: 500 }
    )
  }
}

// Helper function to calculate overall talent health score
function calculateTalentHealth(movements: MovementSummary, comparisons: EmployeeComparison[]): number {
  let score = 50 // Start at neutral
  
  // Positive factors
  score += (movements.promoted * 5) // Promotions are good
  score += (movements.performanceImproved * 3) // Performance improvements are good
  score += (movements.newHires * 2) // Growth is positive
  
  // Negative factors
  score -= (movements.demoted * 5) // Demotions are concerning
  score -= (movements.performanceDeclined * 3) // Performance declines are bad
  score -= (movements.departures * 4) // Departures hurt continuity
  
  // Normalize to 0-100 scale
  const total = comparisons.length || 1
  score = Math.max(0, Math.min(100, score * (100 / total)))
  
  return Math.round(score)
}