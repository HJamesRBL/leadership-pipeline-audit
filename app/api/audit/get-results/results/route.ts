export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rankLeaderRatings } from '@/lib/ranking'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const auditId = searchParams.get('id')

    if (!auditId) {
      // Return empty structure instead of error
      return NextResponse.json({
        auditName: '',
        totalLeaders: 0,
        completedLeaders: 0,
        completionStatus: [],
        stageCounts: [],
        averagePerformance: [],
        rawData: [],
        calculationNote: ''
      })
    }

    // Fetch audit with all related data
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
      include: {
        auditLeaders: {
          include: {
            ratings: {
              include: {
                employee: true
              }
            }
          }
        },
        employees: true
      }
    })

    if (!audit) {
      // Return empty structure instead of error
      return NextResponse.json({
        auditName: '',
        totalLeaders: 0,
        completedLeaders: 0,
        completionStatus: [],
        stageCounts: [],
        averagePerformance: [],
        rawData: [],
        calculationNote: ''
      })
    }

    // Calculate completion status
    const completionStatus = audit.auditLeaders.map(leader => ({
      name: leader.name,
      email: leader.email,
      completed: leader.completed
    }))

    const totalLeaders = audit.auditLeaders.length
    const completedLeaders = audit.auditLeaders.filter(l => l.completed).length

    // Process ratings for completed leaders only
    const allRatings: any[] = []
    
    audit.auditLeaders.forEach(leader => {
      if (leader.completed) {
        rankLeaderRatings(leader.ratings).forEach(({ rating, rank, convertedRank, percentile, total }) => {
          allRatings.push({
            leaderName: leader.name,
            employeeName: rating.employee.name,
            employeeTitle: rating.employee.title,
            employeeBusinessUnit: rating.employee.businessUnit,
            careerStage: rating.careerStage,
            performanceRank: rank,
            convertedRank: convertedRank,
            percentile: percentile,
            totalInGroup: total
          })
        })
      }
    })

    // Calculate stage distribution (count of employees in each stage)
    const stageCounts = [1, 2, 3, 4].map(stage => ({
      stage,
      count: allRatings.filter(r => r.careerStage === stage).length
    }))

    // Calculate average performance percentile by stage
    const averagePerformance = [1, 2, 3, 4].map(stage => {
      const ratingsInStage = allRatings.filter(r => r.careerStage === stage)
      
      if (ratingsInStage.length === 0) {
        return { stage, average: 0 }
      }
      
      // Calculate average percentile for this stage
      const sumPercentiles = ratingsInStage.reduce((sum, r) => sum + r.percentile, 0)
      const avgPercentile = sumPercentiles / ratingsInStage.length
      
      return {
        stage,
        average: avgPercentile
      }
    })

    // Prepare raw data for the table (optional - you can include this if you want to display it)
    const rawData = allRatings.map(r => ({
      leader: r.leaderName,
      employee: r.employeeName,
      title: r.employeeTitle,
      businessUnit: r.employeeBusinessUnit,
      stage: r.careerStage,
      rank: r.performanceRank,
      percentile: r.percentile.toFixed(1)
    }))

    return NextResponse.json({
      auditName: audit.name,
      totalLeaders,
      completedLeaders,
      completionStatus,
      stageCounts,
      averagePerformance,
      rawData, // Include this if you want to display the raw data table
      calculationNote: 'Performance percentile calculated as: ((TotalPeople - Rank + 1) - 1) / (TotalPeople - 1) * 100'
    })

  } catch (error) {
    console.error('Error fetching audit results:', error)
    // Return empty structure instead of error
    return NextResponse.json({
      auditName: '',
      totalLeaders: 0,
      completedLeaders: 0,
      completionStatus: [],
      stageCounts: [],
      averagePerformance: [],
      rawData: [],
      calculationNote: ''
    })
  }
}