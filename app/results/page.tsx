'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea 
} from 'recharts'

interface AuditResult {
  auditName: string
  totalLeaders: number
  completedLeaders: number
  stageCounts: { stage: number; count: number }[]
  averagePerformance: { stage: number; average: number }[]
  completionStatus: { name: string; email: string; completed: boolean }[]
  rawData?: any[]
  calculationNote?: string
}

interface AuditInfo {
  id: string
  name: string
  organizationId?: string
  organizationName?: string
  auditRound?: number
  previousAuditId?: string
  createdAt: string
}

interface ComparisonData {
  currentAudit: any
  previousAudit: any
  comparisons: any[]
  movements: {
    promoted: number
    maintained: number
    demoted: number
    newHires: number
    departures: number
    performanceImproved: number
    performanceMaintained: number
    performanceDeclined: number
  }
  movementPatterns: any
  roiMetrics: {
    highPotentialAdvanced: number
    atRiskImproved: number
    talentHealthScore: number
    successionReadiness: {
      previousReady: number
      currentReady: number
    }
  }
}

interface InterpretationData {
  category: 'CRITICAL' | 'NEEDS ATTENTION' | 'OPTIMIZED'
  headline: string
  bullets: string[]
  icon: string
  bgColor: string
  borderColor: string
  textColor: string
  pillColor: string
}

export default function ResultsPage() {
  const searchParams = useSearchParams()
  const auditIdFromUrl = searchParams.get('auditId')
  
  const [audits, setAudits] = useState<AuditInfo[]>([])
  const [selectedAudit, setSelectedAudit] = useState('')
  const [results, setResults] = useState<AuditResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [selectedPreviousAudit, setSelectedPreviousAudit] = useState('')
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null)
  const [loadingComparison, setLoadingComparison] = useState(false)
  const [currentAuditInfo, setCurrentAuditInfo] = useState<AuditInfo | null>(null)
  const [organizationAudits, setOrganizationAudits] = useState<AuditInfo[]>([])

  // Calculate interpretation metrics
  const getStageDistributionInterpretation = (): InterpretationData | null => {
    if (!results) return null
    
    const stage1Count = results.stageCounts.find(s => s.stage === 1)?.count || 0
    const stage2Count = results.stageCounts.find(s => s.stage === 2)?.count || 0
    const totalCount = results.stageCounts.reduce((sum, s) => sum + s.count, 0)
    const stage12Percentage = totalCount > 0 ? ((stage1Count + stage2Count) / totalCount) * 100 : 0
    
    if (stage12Percentage >= 40) {
      return {
        category: 'CRITICAL',
        headline: 'Leadership Readiness Crisis - Immediate Development Required',
        bullets: [
          'Growth is unlikely as leaders lack the capability to execute expansion strategies',
          'Strategic execution is compromised with most leaders neither aligned with nor capable of delivering on organizational goals',
          'Employee engagement suffers as underdeveloped leaders struggle to inspire and guide their teams effectively',
          'Customer relationships are at risk with leaders unable to maintain service standards or respond to market needs'
        ],
        icon: '🚨',
        bgColor: '#FEE2E2',
        borderColor: '#EF4444',
        textColor: '#991B1B',
        pillColor: '#DC2626'
      }
    } else if (stage12Percentage >= 20) {
      return {
        category: 'NEEDS ATTENTION',
        headline: 'Leadership Development Gaps - Acceleration Needed',
        bullets: [
          'Growth potential exists but faces challenges as some leaders aren\'t ready to scale operations',
          'Strategic alignment is inconsistent with pockets of leaders who need better capability building',
          'Employee engagement is uneven with many teams experiencing leadership gaps',
          'Customer satisfaction is at risk in areas led by underdeveloped leaders'
        ],
        icon: '⚠️',
        bgColor: '#FEF3C7',
        borderColor: '#F59E0B',
        textColor: '#78350F',
        pillColor: '#D97706'
      }
    } else {
      return {
        category: 'OPTIMIZED',
        headline: 'Strong Leadership Maturity - Ready to Scale',
        bullets: [
          'Organization has critical mass to grow and scale with capable leaders ready to execute',
          'Leaders are aligned and capable of delivering on strategic objectives',
          'Employee engagement is strong with mature leaders creating positive work environments',
          'Customer relationships thrive with experienced leaders ensuring consistent value delivery'
        ],
        icon: '✅',
        bgColor: '#D1FAE5',
        borderColor: '#10B981',
        textColor: '#064E3B',
        pillColor: '#059669'
      }
    }
  }

  const getPerformanceGradientInterpretation = (): InterpretationData | null => {
    if (!results || !results.averagePerformance || results.averagePerformance.length === 0) return null
    
    const stage1Avg = results.averagePerformance.find(s => s.stage === 1)?.average || 0
    const stage2Avg = results.averagePerformance.find(s => s.stage === 2)?.average || 0
    const stage4Avg = results.averagePerformance.find(s => s.stage === 4)?.average || 0
    
    const stage12Avg = (stage1Avg + stage2Avg) / 2 || 0
    const gradient = stage4Avg - stage12Avg
    
    if (gradient < 0) {
      return {
        category: 'CRITICAL',
        headline: 'Performance Inversion - Senior Leadership Crisis',
        bullets: [
          'Senior leaders are being outperformed by those in earlier stages',
          'Experience isn\'t translating into effectiveness',
          'Risk of losing high-performing junior leaders who see limited inspiring examples above them'
        ],
        icon: '📉',
        bgColor: '#FEE2E2',
        borderColor: '#EF4444',
        textColor: '#991B1B',
        pillColor: '#DC2626'
      }
    } else if (gradient <= 20) {
      return {
        category: 'NEEDS ATTENTION',
        headline: 'Limited Performance Progression',
        bullets: [
          'Performance improves only marginally with career progression',
          'Development programs aren\'t effectively building capabilities as leaders advance',
          'Promotion decisions may be based on tenure rather than demonstrated excellence'
        ],
        icon: '📊',
        bgColor: '#FEF3C7',
        borderColor: '#F59E0B',
        textColor: '#78350F',
        pillColor: '#D97706'
      }
    } else {
      return {
        category: 'OPTIMIZED',
        headline: 'Strong Performance Maturation',
        bullets: [
          'Healthy performance progression where experience translates into effectiveness',
          'Senior leaders demonstrate the value of development and experience',
          'Effective development programs and proper placement of leaders at each stage'
        ],
        icon: '📈',
        bgColor: '#D1FAE5',
        borderColor: '#10B981',
        textColor: '#064E3B',
        pillColor: '#059669'
      }
    }
  }

  // Get overall status for executive summary
  const getOverallStatus = () => {
    const stageInterpretation = getStageDistributionInterpretation()
    const perfInterpretation = getPerformanceGradientInterpretation()
    
    if (!stageInterpretation || !perfInterpretation) return null
    
    if (stageInterpretation.category === 'CRITICAL' || perfInterpretation.category === 'CRITICAL') {
      return { status: 'CRITICAL', icon: '🚨', color: 'text-red-600' }
    } else if (stageInterpretation.category === 'NEEDS ATTENTION' || perfInterpretation.category === 'NEEDS ATTENTION') {
      return { status: 'NEEDS ATTENTION', icon: '⚠️', color: 'text-yellow-600' }
    } else {
      return { status: 'OPTIMIZED', icon: '✅', color: 'text-green-600' }
    }
  }

  // Get recommendations based on status
  const getRecommendations = () => {
    const stageInterpretation = getStageDistributionInterpretation()
    if (!stageInterpretation) return []
    
    if (stageInterpretation.category === 'CRITICAL') {
      return [
        { title: 'Establish Business Case for Leadership Crisis', description: 'Document the cost of underdeveloped leaders on growth, strategy, and customer satisfaction' },
        { title: 'Deploy Rapid Assessment Tools', description: 'Conduct individual Leadership Code assessments and psychometric evaluations' },
        { title: 'Intensive Development Interventions', description: 'Pair Stage 1-2 leaders with Stage 4 mentors, enroll in Leadership Academy Bootcamp' },
        { title: 'Create 90-Day Acceleration Plans', description: 'Set clear milestones for Stage progression' },
        { title: 'Consider External Talent Acquisition', description: 'Bring in experienced leaders for critical Stage 3-4 positions' }
      ]
    } else if (stageInterpretation.category === 'NEEDS ATTENTION') {
      return [
        { title: 'Refine Competency Model', description: 'Clarify foundational and differentiating competencies' },
        { title: 'Implement Structured Assessment', description: 'Use aggregated 360 assessments to identify capability gaps' },
        { title: 'Focused Development Options', description: 'Create stretch assignments and cross-functional projects' },
        { title: 'Measure Progress Quarterly', description: 'Track Stage progression with follow-up audits' },
        { title: 'Build into Performance Management', description: 'Make Stage progression a key performance indicator' }
      ]
    } else {
      return [
        { title: 'Document Best Practices', description: 'Capture what\'s working in your leadership development approach' },
        { title: 'Focus on Stage 3 to 4 Progression', description: 'Implement advanced academies for senior leader development' },
        { title: 'Advanced Development Initiatives', description: 'Global rotations and board-level exposure' },
        { title: 'Measure Business Impact', description: 'Track correlation between leadership capability and investor metrics' },
        { title: 'Manage Reputation', description: 'Include leadership strength in annual reports' }
      ]
    }
  }

  // Calculate metrics for executive summary
  const stage12Percentage = results ? 
    Math.round(((results.stageCounts.find(s => s.stage === 1)?.count || 0) + 
    (results.stageCounts.find(s => s.stage === 2)?.count || 0)) / 
    results.stageCounts.reduce((sum, s) => sum + s.count, 0) * 100) : 0

  const performanceGradient = results && results.averagePerformance.length > 0 ? 
    Math.round((results.averagePerformance.find(s => s.stage === 4)?.average || 0) - 
    ((results.averagePerformance.find(s => s.stage === 1)?.average || 0) + 
    (results.averagePerformance.find(s => s.stage === 2)?.average || 0)) / 2) : 0

  // PDF Export Function
  const exportToPDF = async () => {
    if (!results) {
      alert('No results to export')
      return
    }

    try {
      // Show loading indicator
      const loadingDiv = document.createElement('div')
      loadingDiv.innerHTML = 'Generating PDF... Please wait...'
      loadingDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; font-size: 18px;'
      document.body.appendChild(loadingDiv)

      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageHeight = pdf.internal.pageSize.getHeight()
      const pageWidth = pdf.internal.pageSize.getWidth()
      
      // Define sections to export
      const sections: { element: Element | null; name: string }[] = []
      
      // Include executive summary if it exists
      const execSummary = document.querySelector('.executive-summary-section')
      if (execSummary) {
        sections.push({ element: execSummary, name: 'Executive Summary' })
      }
      
      // Always include basic sections if they exist
      const basicSections = [
        { selector: '.completion-status-section', name: 'Completion Status' },
        { selector: '.leaders-by-stage-section', name: 'Leaders by Stage' },
        { selector: '.stage-by-performance-section', name: 'Stage by Performance' },
        { selector: '.misalignment-analysis-section', name: 'Misalignment Analysis' },
        { selector: '.recommendations-section', name: 'Recommendations' },
      ]
      
      basicSections.forEach(section => {
        const element = document.querySelector(section.selector)
        if (element) {
          sections.push({ element, name: section.name })
        }
      })
      
      // Add comparison sections if comparison mode is active
      if (compareMode && comparisonData) {
        // Add movement summary cards
        const movementCards = document.querySelector('.mb-6.grid.grid-cols-4.gap-4')
        if (movementCards) {
          sections.unshift({ element: movementCards, name: 'Movement Summary' })
        }
        
        // Add all comparison tables and charts
        const comparisonSections = document.querySelectorAll('.bg-white.p-6.rounded-lg.shadow.mb-6')
        comparisonSections.forEach((element) => {
          const heading = element.querySelector('h2')
          if (heading) {
            const text = heading.textContent || ''
            if (text.includes('Pipeline Movement Analysis') || 
                text.includes('Leaders by Stage - Comparison') || 
                text.includes('Stage by Performance - Comparison')) {
              // Insert comparison sections before the basic sections
              const insertIndex = sections.findIndex(s => s.name === 'Completion Status')
              if (insertIndex >= 0) {
                sections.splice(insertIndex, 0, { element, name: text })
              } else {
                sections.push({ element, name: text })
              }
            }
          }
        })
      }
      
      let yPosition = 20
      
      // Add title
      pdf.setFontSize(20)
      pdf.text(results.auditName || 'Audit Results', pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 10
      
      // Add metadata
      pdf.setFontSize(10)
      pdf.setTextColor(100)
      pdf.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, pageWidth / 2, yPosition, { align: 'center' })
      
      if (currentAuditInfo) {
        yPosition += 5
        pdf.text(`Organization: ${currentAuditInfo.organizationName || 'N/A'} | Round: ${currentAuditInfo.auditRound || 1}`, pageWidth / 2, yPosition, { align: 'center' })
      }
      
      // Add comparison mode indicator
      if (compareMode && comparisonData) {
        yPosition += 5
        pdf.setTextColor(0, 0, 255)
        pdf.text(`Comparison: Round ${comparisonData.previousAudit.round} vs Round ${comparisonData.currentAudit.round}`, pageWidth / 2, yPosition, { align: 'center' })
      }
      
      yPosition += 10
      pdf.setTextColor(0)
      
      // Process each section
      for (const section of sections) {
        if (!section.element) continue
        
        try {
          // Capture the element as canvas
          const canvas = await html2canvas(section.element as HTMLElement, {
            scale: 2,
            logging: false,
            useCORS: true,
            backgroundColor: '#ffffff',
            windowWidth: (section.element as HTMLElement).scrollWidth,
            windowHeight: (section.element as HTMLElement).scrollHeight
          })
          
          const imgData = canvas.toDataURL('image/png')
          const imgWidth = pageWidth - 20 // 10mm margins on each side
          const imgHeight = (canvas.height * imgWidth) / canvas.width
          
          // Check if we need a new page
          if (yPosition + imgHeight > pageHeight - 20) {
            pdf.addPage()
            yPosition = 20
          }
          
          // Add the image to PDF
          pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth, imgHeight)
          yPosition += imgHeight + 10
        } catch (err) {
          console.error(`Error capturing section ${section.name}:`, err)
        }
      }
      
      // Save the PDF with appropriate filename
      const fileName = `${results.auditName.replace(/[^a-z0-9]/gi, '_')}_${compareMode && comparisonData ? 'comparison_' : ''}results_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)
      
      // Remove loading indicator
      document.body.removeChild(loadingDiv)
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF. Please try again.')
      // Remove loading indicator if there was an error
      const loadingDiv = document.querySelector('div[style*="Generating PDF"]')
      if (loadingDiv) {
        document.body.removeChild(loadingDiv)
      }
    }
  }
  
  // Continue with your useEffects...
  
  useEffect(() => {
    fetchAudits()
  }, [])

  useEffect(() => {
    // If there's an auditId in the URL, use it
    if (auditIdFromUrl) {
      setSelectedAudit(auditIdFromUrl)
    }
  }, [auditIdFromUrl])

  useEffect(() => {
    // Auto-fetch results when audit is selected (either from URL or dropdown)
    if (selectedAudit) {
      fetchResults()
      // Get info about the selected audit
      const audit = audits.find(a => a.id === selectedAudit)
      if (audit) {
        setCurrentAuditInfo(audit)
        // Find other audits from the same organization
        const sameOrgAudits = audits.filter(a => 
          a.organizationId === audit.organizationId && 
          a.id !== selectedAudit &&
          (a.auditRound || 1) < (audit.auditRound || 1)
        ).sort((a, b) => (b.auditRound || 1) - (a.auditRound || 1))
        setOrganizationAudits(sameOrgAudits)
        
        // Auto-select previous audit if it exists
        if (audit.previousAuditId) {
          setSelectedPreviousAudit(audit.previousAuditId)
        } else if (sameOrgAudits.length > 0) {
          setSelectedPreviousAudit(sameOrgAudits[0].id)
        }
      }
    }
  }, [selectedAudit, audits])

  const fetchAudits = async () => {
  try {
    const response = await fetch('/api/audit/list')
    if (response.ok) {
      const data = await response.json()
      // Ensure data is always an array
      setAudits(Array.isArray(data) ? data : [])
    }
  } catch (error) {
    console.error('Error fetching audits:', error)
    setAudits([]) // Set empty array on error
  }
}

  const fetchResults = async () => {
  if (!selectedAudit) return
  
  setLoading(true)
  try {
    const response = await fetch(`/api/audit/get-results/results?id=${selectedAudit}`)
    if (response.ok) {
      const data = await response.json()
      // Ensure all arrays in results are actually arrays
      const safeResults = {
        ...data,
        stageCounts: Array.isArray(data.stageCounts) ? data.stageCounts : [],
        averagePerformance: Array.isArray(data.averagePerformance) ? data.averagePerformance : [],
        completionStatus: Array.isArray(data.completionStatus) ? data.completionStatus : [],
        rawData: Array.isArray(data.rawData) ? data.rawData : []
      }
      setResults(safeResults)
    }
  } catch (error) {
    console.error('Error fetching results:', error)
    // Set empty results structure on error
    setResults({
      auditName: '',
      totalLeaders: 0,
      completedLeaders: 0,
      stageCounts: [],
      averagePerformance: [],
      completionStatus: [],
      rawData: []
    })
  } finally {
    setLoading(false)
  }
}

  const fetchComparison = async () => {
  if (!selectedAudit || !selectedPreviousAudit) return
  
  setLoadingComparison(true)
  try {
    const response = await fetch(`/api/audit/compare?currentId=${selectedAudit}&previousId=${selectedPreviousAudit}`)
    if (response.ok) {
      const data = await response.json()
      // Ensure all arrays in comparison data are actually arrays
      const safeComparisonData = {
        ...data,
        comparisons: Array.isArray(data.comparisons) ? data.comparisons : [],
        movementPatterns: {
          transitions: Array.isArray(data.movementPatterns?.transitions) ? data.movementPatterns.transitions : [],
          byStageChange: {
            promoted: Array.isArray(data.movementPatterns?.byStageChange?.promoted) ? data.movementPatterns.byStageChange.promoted : [],
            maintained: Array.isArray(data.movementPatterns?.byStageChange?.maintained) ? data.movementPatterns.byStageChange.maintained : [],
            demoted: Array.isArray(data.movementPatterns?.byStageChange?.demoted) ? data.movementPatterns.byStageChange.demoted : []
          }
        }
      }
      setComparisonData(safeComparisonData)
    }
  } catch (error) {
    console.error('Error fetching comparison:', error)
    setComparisonData(null)
  } finally {
    setLoadingComparison(false)
  }
}

  const stageColors = {
    1: '#E8B70B',  // Yellow
    2: '#ED1B34',  // Red
    3: '#0086D6',  // Blue
    4: '#071D49'   // Navy
  }

  // Check if this organization has multiple rounds
  const hasMultipleRounds = currentAuditInfo && (currentAuditInfo.auditRound || 1) > 1 && organizationAudits.length > 0

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Audit Results</h1>

      {/* Audit Selection */}
      <div className="mb-8 flex gap-4">
        <select
          value={selectedAudit}
          onChange={(e) => setSelectedAudit(e.target.value)}
          className="flex-1 p-2 border rounded"
        >
          <option value="">Select an audit to view results</option>
          {audits.map(audit => (
            <option key={audit.id} value={audit.id}>
              {audit.name} {audit.auditRound && audit.auditRound > 1 ? `(Round ${audit.auditRound})` : ''} - {new Date(audit.createdAt).toLocaleDateString()}
            </option>
          ))}
        </select>
        <button
          onClick={fetchResults}
          disabled={!selectedAudit || loading}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh Results'}
        </button>
      </div>

      {/* Executive Summary Dashboard - NEW */}
      {results && !loading && (
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg executive-summary-section">
          <h2 className="text-xl font-bold mb-4">Leadership Health Assessment</h2>
          
          <div className="grid grid-cols-3 gap-4">
            {/* Overall Status Card */}
            <div className="bg-white p-4 rounded-lg text-center">
              <div className="text-3xl mb-2">{getOverallStatus()?.icon}</div>
              <div className={`text-lg font-bold ${getOverallStatus()?.color}`}>
                {getOverallStatus()?.status}
              </div>
              <div className="text-sm text-gray-600">Overall Assessment</div>
            </div>
            
            {/* Stage Distribution Card */}
            <div className="bg-white p-4 rounded-lg">
              <div className="text-sm text-gray-600">Stage Readiness</div>
              <div className="text-2xl font-bold">{stage12Percentage}%</div>
              <div className="text-xs">in Stages 1-2</div>
              <div className={`text-xs mt-1 ${
                stage12Percentage >= 40 ? 'text-red-600' : 
                stage12Percentage >= 20 ? 'text-yellow-600' : 
                'text-green-600'
              }`}>
                {stage12Percentage >= 40 ? 'Critical' : 
                 stage12Percentage >= 20 ? 'Needs Attention' : 
                 'Optimized'}
              </div>
            </div>
            
            {/* Performance Gradient Card */}
            <div className="bg-white p-4 rounded-lg">
              <div className="text-sm text-gray-600">Performance Gradient</div>
              <div className="text-2xl font-bold">
                {performanceGradient > 0 ? '+' : ''}{performanceGradient}pts
              </div>
              <div className="text-xs">Stage 4 vs Stage 1-2</div>
              <div className={`text-xs mt-1 ${
                performanceGradient < 0 ? 'text-red-600' : 
                performanceGradient <= 20 ? 'text-yellow-600' : 
                'text-green-600'
              }`}>
                {performanceGradient < 0 ? 'Performance Inversion' : 
                 performanceGradient <= 20 ? 'Limited Progression' : 
                 'Strong Maturation'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Controls - Only show if organization has multiple rounds */}
      {hasMultipleRounds && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-blue-900">
                📊 Comparison Analysis Available
              </h3>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                Round {currentAuditInfo?.auditRound || 1} vs Round {organizationAudits[0]?.auditRound || 1}
              </span>
            </div>
            <button
              onClick={() => setCompareMode(!compareMode)}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                compareMode 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-50'
              }`}
            >
              {compareMode ? '✓ Comparison Mode On' : 'Enable Comparison'}
            </button>
          </div>
          
          {compareMode && (
            <div className="mt-3 p-3 bg-white rounded border border-blue-200">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-sm text-gray-700">Compare with previous audit:</label>
                  <select
                    value={selectedPreviousAudit}
                    onChange={(e) => setSelectedPreviousAudit(e.target.value)}
                    className="w-full mt-1 p-2 border rounded"
                  >
                    {organizationAudits.map(audit => (
                      <option key={audit.id} value={audit.id}>
                        {audit.name} (Round {audit.auditRound || 1})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={fetchComparison}
                  disabled={!selectedPreviousAudit || loadingComparison}
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 font-medium"
                  style={{ background: '#5EC4B6' }}
                >
                  {loadingComparison ? 'Analyzing...' : '🔍 Run Comparison'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="text-xl text-gray-600">Loading results...</div>
        </div>
      )}

      {/* Comparison Results - Pipeline Movement Analysis */}
      {compareMode && comparisonData && (
        <>
          {/* Movement Summary Cards */}
          <div className="mb-6 grid grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Advanced</p>
                  <p className="text-2xl font-bold text-green-600">
                    {comparisonData.movements.promoted}
                  </p>
                </div>
                <span className="text-3xl">⬆️</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Maintained</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {comparisonData.movements.maintained}
                  </p>
                </div>
                <span className="text-3xl">➡️</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">New Hires</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {comparisonData.movements.newHires}
                  </p>
                </div>
                <span className="text-3xl">✨</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Departures</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {comparisonData.movements.departures}
                  </p>
                </div>
                <span className="text-3xl">👋</span>
              </div>
            </div>
          </div>

          {/* Pipeline Movement Analysis */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-2">Pipeline Movement Analysis</h2>
            <p className="text-sm text-gray-600 mb-6">
              Track individual progression between stages from Round {comparisonData.previousAudit.round} to Round {comparisonData.currentAudit.round}
            </p>
            
            {/* Movement Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead style={{ backgroundColor: '#071D49' }}>
                  <tr>
                    <th className="px-4 py-2 text-left" style={{ color: 'white' }}>Employee</th>
                    <th className="px-4 py-2 text-left" style={{ color: 'white' }}>Business Unit</th>
                    <th className="px-4 py-2 text-center" style={{ color: 'white' }}>Previous Stage</th>
                    <th className="px-4 py-2 text-center" style={{ color: 'white' }}>Current Stage</th>
                    <th className="px-4 py-2 text-center" style={{ color: 'white' }}>Stage Change</th>
                    <th className="px-4 py-2 text-center" style={{ color: 'white' }}>Previous Perf %</th>
                    <th className="px-4 py-2 text-center" style={{ color: 'white' }}>Current Perf %</th>
                    <th className="px-4 py-2 text-center" style={{ color: 'white' }}>Perf Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {comparisonData.comparisons
                    .filter(c => c.previousStage && c.currentStage)
                    .sort((a, b) => (b.stageChange || 0) - (a.stageChange || 0))
                    .map((comp, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{comp.name}</td>
                        <td className="px-4 py-2">{comp.businessUnit}</td>
                        <td className="px-4 py-2 text-center">
                          <span className="px-2 py-1 rounded text-white text-xs font-medium"
                            style={{ backgroundColor: stageColors[comp.previousStage as keyof typeof stageColors] }}>
                            Stage {comp.previousStage}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className="px-2 py-1 rounded text-white text-xs font-medium"
                            style={{ backgroundColor: stageColors[comp.currentStage as keyof typeof stageColors] }}>
                            Stage {comp.currentStage}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            comp.stageChange! > 0 ? 'bg-green-100 text-green-800' :
                            comp.stageChange! < 0 ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {comp.stageChange! > 0 ? '+' : ''}{comp.stageChange}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">{comp.previousPerformance}%</td>
                        <td className="px-4 py-2 text-center">{comp.currentPerformance}%</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            comp.performanceChange! > 5 ? 'bg-green-100 text-green-800' :
                            comp.performanceChange! < -5 ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {comp.performanceChange! > 0 ? '+' : ''}{comp.performanceChange}%
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Comparison Charts - Leaders by Stage */}
          {compareMode && comparisonData && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h2 className="text-xl font-semibold mb-2">Leaders by Stage - Comparison</h2>
              <p className="text-sm text-gray-600 mb-6">
                Compare stage distribution between Round {comparisonData.previousAudit.round} and Round {comparisonData.currentAudit.round}
              </p>
              
              <div className="grid grid-cols-2 gap-8">
                {/* Round 1 Chart */}
                <div>
                  <h3 className="text-center font-semibold mb-4 text-gray-700">
                    Round {comparisonData.previousAudit.round} - {new Date(comparisonData.previousAudit.date).toLocaleDateString()}
                  </h3>
                  <div style={{ position: 'relative', height: '300px', paddingLeft: '40px' }}>
                    {/* Y-axis scale for Round 1 */}
                    <div style={{ 
                      position: 'absolute',
                      left: '10px',
                      top: '0',
                      height: '250px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: '#666',
                      fontWeight: 'bold'
                    }}>
                      <span>100%</span>
                      <span>75%</span>
                      <span>50%</span>
                      <span>25%</span>
                      <span>0%</span>
                    </div>
                    
                    <div style={{ height: '250px', position: 'relative', marginLeft: '20px' }}>
                      {/* Grid lines for Round 1 only */}
                      <div style={{ position: 'absolute', left: '0', right: '0', top: '0', height: '100%' }}>
                        {[0, 25, 50, 75, 100].map(val => (
                          <div key={val} style={{ 
                            position: 'absolute',
                            left: '0',
                            right: '0',
                            top: `${100 - val}%`,
                            borderTop: '1px solid #e5e7eb'
                          }}></div>
                        ))}
                      </div>
                      
                      {/* Bars for Round 1 */}
                      <div style={{ 
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'space-evenly',
                        height: '100%',
                        position: 'relative',
                        paddingLeft: '10px',
                        paddingRight: '10px'
                      }}>
                        {[1, 2, 3, 4].map(stage => {
                          const previousData = comparisonData.comparisons.filter(c => c.previousStage === stage)
                          const total = comparisonData.comparisons.filter(c => c.previousStage).length
                          const percentage = total > 0 ? (previousData.length / total) * 100 : 0
                          
                          return (
                            <div key={stage} style={{ 
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              width: '60px'
                            }}>
                              <div style={{ 
                                width: '45px',
                                height: `${percentage * 2.5}px`,
                                backgroundColor: stageColors[stage as keyof typeof stageColors],
                                position: 'relative'
                              }}>
                                <span style={{ 
                                  position: 'absolute',
                                  top: '-20px',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {percentage.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      
                      {/* X-axis labels for Round 1 */}
                      <div style={{ 
                        display: 'flex',
                        justifyContent: 'space-evenly',
                        marginTop: '10px',
                        paddingLeft: '10px',
                        paddingRight: '10px'
                      }}>
                        {[1, 2, 3, 4].map(stage => {
                          const count = comparisonData.comparisons.filter(c => c.previousStage === stage).length
                          return (
                            <div key={stage} style={{ 
                              textAlign: 'center',
                              width: '60px'
                            }}>
                              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Stage {stage}</div>
                              <div style={{ fontSize: '10px', color: '#666' }}>({count})</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Round 2 Chart */}
                <div>
                  <h3 className="text-center font-semibold mb-4 text-gray-700">
                    Round {comparisonData.currentAudit.round} - {new Date(comparisonData.currentAudit.date).toLocaleDateString()}
                  </h3>
                  <div style={{ position: 'relative', height: '300px', paddingLeft: '40px' }}>
                    {/* Y-axis scale for Round 2 */}
                    <div style={{ 
                      position: 'absolute',
                      left: '20px',
                      top: '0',
                      height: '250px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: '#666',
                      fontWeight: 'bold'
                    }}>
                      <span>100%</span>
                      <span>75%</span>
                      <span>50%</span>
                      <span>25%</span>
                      <span>0%</span>
                    </div>
                    
                    <div style={{ height: '250px', position: 'relative', marginLeft: '20px' }}>
                      {/* Grid lines for Round 2 only */}
                      <div style={{ position: 'absolute', left: '0', right: '0', top: '0', height: '100%' }}>
                        {[0, 25, 50, 75, 100].map(val => (
                          <div key={val} style={{ 
                            position: 'absolute',
                            left: '0',
                            right: '0',
                            top: `${100 - val}%`,
                            borderTop: '1px solid #e5e7eb'
                          }}></div>
                        ))}
                      </div>
                      
                      {/* Bars for Round 2 */}
                      <div style={{ 
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'space-evenly',
                        height: '100%',
                        position: 'relative',
                        paddingLeft: '10px',
                        paddingRight: '10px'
                      }}>
                        {[1, 2, 3, 4].map(stage => {
                          const count = results.stageCounts.find(s => s.stage === stage)?.count || 0
                          const total = results.stageCounts.reduce((sum, s) => sum + s.count, 0)
                          const percentage = total > 0 ? (count / total) * 100 : 0
                          
                          return (
                            <div key={stage} style={{ 
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              width: '60px'
                            }}>
                              <div style={{ 
                                width: '45px',
                                height: `${percentage * 2.5}px`,
                                backgroundColor: stageColors[stage as keyof typeof stageColors],
                                position: 'relative'
                              }}>
                                <span style={{ 
                                  position: 'absolute',
                                  top: '-20px',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {percentage.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      
                      {/* X-axis labels for Round 2 */}
                      <div style={{ 
                        display: 'flex',
                        justifyContent: 'space-evenly',
                        marginTop: '10px',
                        paddingLeft: '10px',
                        paddingRight: '10px'
                      }}>
                        {[1, 2, 3, 4].map(stage => {
                          const count = results.stageCounts.find(s => s.stage === stage)?.count || 0
                          return (
                            <div key={stage} style={{ 
                              textAlign: 'center',
                              width: '60px'
                            }}>
                              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Stage {stage}</div>
                              <div style={{ fontSize: '10px', color: '#666' }}>({count})</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Change Summary */}
              <div className="mt-4 p-3 bg-blue-50 rounded">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  {[1, 2, 3, 4].map(stage => {
                    const prevCount = comparisonData.comparisons.filter(c => c.previousStage === stage).length
                    const currCount = results.stageCounts.find(s => s.stage === stage)?.count || 0
                    const change = currCount - prevCount
                    return (
                      <div key={stage} className="text-center">
                        <span className="font-semibold" style={{ color: stageColors[stage as keyof typeof stageColors] }}>
                          Stage {stage}:
                        </span>
                        <span className={`ml-2 ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {change > 0 ? '+' : ''}{change}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Comparison Charts - Stage by Performance */}
{compareMode && comparisonData && (
  <div className="bg-white p-6 rounded-lg shadow mb-6">
    <h2 className="text-xl font-semibold mb-2">Stage by Performance - Comparison</h2>
    <p className="text-sm text-gray-600 mb-6">
      Compare average performance by stage between Round {comparisonData.previousAudit.round} and Round {comparisonData.currentAudit.round}
    </p>
    
    <div className="grid grid-cols-2 gap-8">
      {/* Round 1 Chart */}
      <div>
        <h3 className="text-center font-semibold mb-4 text-gray-700">
          Round {comparisonData.previousAudit.round} - Average Performance
        </h3>
        <div style={{ position: 'relative', height: '300px', paddingLeft: '40px' }}>
          {/* Y-axis scale for Round 1 */}
          <div style={{ 
            position: 'absolute',
            left: '10px',
            top: '0',
            height: '250px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#666',
            fontWeight: 'bold'
          }}>
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>
          
          <div style={{ height: '250px', position: 'relative', marginLeft: '20px' }}>
            {/* Grid lines for Round 1 only */}
            <div style={{ position: 'absolute', left: '0', right: '0', top: '0', height: '100%' }}>
              {[0, 25, 50, 75, 100].map(val => (
                <div key={val} style={{ 
                  position: 'absolute',
                  left: '0',
                  right: '0',
                  top: `${100 - val}%`,
                  borderTop: '1px solid #e5e7eb'
                }}></div>
              ))}
            </div>
            
            {/* Bars for Round 1 */}
            <div style={{ 
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-evenly',
              height: '100%',
              position: 'relative',
              paddingLeft: '10px',
              paddingRight: '10px'
            }}>
              {[1, 2, 3, 4].map(stage => {
                // Calculate average performance for previous round
                const stageData = comparisonData.comparisons.filter(c => c.previousStage === stage && c.previousPerformance)
                const avgPerf = stageData.length > 0 
                  ? stageData.reduce((sum, c) => sum + (c.previousPerformance || 0), 0) / stageData.length
                  : 0
                
                return (
                  <div key={stage} style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '60px'
                  }}>
                    <div style={{ 
                      width: '45px',
                      height: `${avgPerf * 2.5}px`,
                      backgroundColor: stageColors[stage as keyof typeof stageColors],
                      position: 'relative'
                    }}>
                      <span style={{ 
                        position: 'absolute',
                        top: '-20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '12px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap'
                      }}>
                        {avgPerf.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* X-axis labels for Round 1 */}
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-evenly',
              marginTop: '10px',
              paddingLeft: '10px',
              paddingRight: '10px'
            }}>
              {[1, 2, 3, 4].map(stage => {
                const count = comparisonData.comparisons.filter(c => c.previousStage === stage).length
                return (
                  <div key={stage} style={{ 
                    textAlign: 'center',
                    width: '60px'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Stage {stage}</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>({count})</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Round 2 Chart */}
      <div>
        <h3 className="text-center font-semibold mb-4 text-gray-700">
          Round {comparisonData.currentAudit.round} - Average Performance
        </h3>
        <div style={{ position: 'relative', height: '300px', paddingLeft: '40px' }}>
          {/* Y-axis scale for Round 2 */}
          <div style={{ 
            position: 'absolute',
            left: '20px',
            top: '0',
            height: '250px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#666',
            fontWeight: 'bold'
          }}>
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>
          
          <div style={{ height: '250px', position: 'relative', marginLeft: '20px' }}>
            {/* Grid lines for Round 2 only */}
            <div style={{ position: 'absolute', left: '0', right: '0', top: '0', height: '100%' }}>
              {[0, 25, 50, 75, 100].map(val => (
                <div key={val} style={{ 
                  position: 'absolute',
                  left: '0',
                  right: '0',
                  top: `${100 - val}%`,
                  borderTop: '1px solid #e5e7eb'
                }}></div>
              ))}
            </div>
            
            {/* Bars for Round 2 */}
            <div style={{ 
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-evenly',
              height: '100%',
              position: 'relative',
              paddingLeft: '10px',
              paddingRight: '10px'
            }}>
              {results.averagePerformance.map(item => {
                return (
                  <div key={item.stage} style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '60px'
                  }}>
                    <div style={{ 
                      width: '45px',
                      height: `${item.average * 2.5}px`,
                      backgroundColor: stageColors[item.stage as keyof typeof stageColors],
                      position: 'relative'
                    }}>
                      <span style={{ 
                        position: 'absolute',
                        top: '-20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '12px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.average.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* X-axis labels for Round 2 */}
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-evenly',
              marginTop: '10px',
              paddingLeft: '10px',
              paddingRight: '10px'
            }}>
              {results.averagePerformance.map(item => {
                const stageCount = results.stageCounts.find(s => s.stage === item.stage)?.count || 0
                return (
                  <div key={item.stage} style={{ 
                    textAlign: 'center',
                    width: '60px'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Stage {item.stage}</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>({stageCount})</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Performance Change Summary */}
    <div className="mt-4 p-3 bg-blue-50 rounded">
      <div className="grid grid-cols-4 gap-4 text-sm">
        {[1, 2, 3, 4].map(stage => {
          // Calculate previous average
          const prevData = comparisonData.comparisons.filter(c => c.previousStage === stage && c.previousPerformance)
          const prevAvg = prevData.length > 0 
            ? prevData.reduce((sum, c) => sum + (c.previousPerformance || 0), 0) / prevData.length
            : 0
          
          // Get current average
          const currAvg = results.averagePerformance.find(s => s.stage === stage)?.average || 0
          const change = currAvg - prevAvg
          
          return (
            <div key={stage} className="text-center">
              <span className="font-semibold" style={{ color: stageColors[stage as keyof typeof stageColors] }}>
                Stage {stage}:
              </span>
              <span className={`ml-2 ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  </div>
)}
        </>
      )}

      {/* Results Display */}
{results && !loading && (
  <div className="space-y-6">
    {/* Export Actions Bar */}
    <div className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
      <h2 className="text-lg font-semibold text-gray-700">Export Options</h2>
      <div className="flex gap-3">
        <button
          onClick={exportToPDF}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium flex items-center gap-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17h6M9 13h6M9 9h4" />
          </svg>
          Export to PDF
        </button>
        <button
          onClick={() => {
            // This is your existing CSV export code - we'll move it here
            const rawData = (results as any).rawData
            
            if (!rawData || rawData.length === 0) {
              alert('No data available to export')
              return
            }
            
            const headers = ['Leader', 'Employee', 'Title', 'Business Unit', 'Stage', 'Rank', 'Percentile']
            const csvContent = [
              headers.join(','),
              ...rawData.map((row: any) => [
                `"${row.leader}"`,
                `"${row.employee}"`,
                `"${row.title}"`,
                `"${row.businessUnit}"`,
                row.stage,
                row.rank,
                row.percentile
              ].join(','))
            ].join('\n')
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)
            const fileName = `${results.auditName.replace(/[^a-z0-9]/gi, '_')}_results_${new Date().toISOString().split('T')[0]}.csv`
            
            link.setAttribute('href', url)
            link.setAttribute('download', fileName)
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
          }}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium flex items-center gap-2 transition-colors"
          style={{ background: '#5EC4B6' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          Export to CSV
        </button>
      </div>
    </div>
          {/* Completion Status */}
          <div className="bg-white p-6 rounded-lg shadow completion-status-section">
            <h2 className="text-xl font-semibold mb-4">
              Completion Status: {results.completedLeaders}/{results.totalLeaders} 
              ({Math.round((results.completedLeaders / results.totalLeaders) * 100)}%)
            </h2>
            <div className="space-y-2">
              {results.completionStatus.map((leader, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span>{leader.name} ({leader.email})</span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    leader.completed 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {leader.completed ? '✓ Completed' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Leaders by Stage - Vertical Bar Chart with Interpretation */}
          <div className="bg-white p-6 rounded-lg shadow leaders-by-stage-section">
            <h2 className="text-xl font-semibold mb-6">Leaders by Stage</h2>
            
            {/* Chart Container - YOUR EXISTING CHART */}
            <div style={{ position: 'relative', height: '350px', paddingLeft: '120px' }}>
              {/* Y-axis label */}
              <div style={{ 
                position: 'absolute',
                left: '5px',
                top: '50%',
                transform: 'translateY(-50%) rotate(-90deg)',
                transformOrigin: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#333',
                whiteSpace: 'nowrap'
              }}>
                Percentage of Leaders
              </div>
              
              {/* Main chart area */}
              <div style={{ height: '300px', position: 'relative', marginLeft: '20px' }}>
                {/* Y-axis scale */}
                <div style={{ 
                  position: 'absolute',
                  left: '-30px',
                  top: '0',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: '#666'
                }}>
                  <span>100%</span>
                  <span>75%</span>
                  <span>50%</span>
                  <span>25%</span>
                  <span>0%</span>
                </div>
                
                {/* Grid lines */}
                <div style={{ position: 'absolute', inset: '0' }}>
                  {[0, 25, 50, 75, 100].map(val => (
                    <div key={val} style={{ 
                      position: 'absolute',
                      left: '0',
                      right: '0',
                      top: `${100 - val}%`,
                      borderTop: '1px solid #e5e7eb'
                    }}></div>
                  ))}
                </div>
                
                {/* Bars container */}
                <div style={{ 
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-evenly',
                  height: '100%',
                  position: 'relative',
                  paddingLeft: '40px',
                  paddingRight: '40px'
                }}>
                  {[1, 2, 3, 4].map(stage => {
                    const count = results.stageCounts.find(s => s.stage === stage)?.count || 0
                    const total = results.stageCounts.reduce((sum, s) => sum + s.count, 0)
                    const percentage = total > 0 ? (count / total) * 100 : 0
                    
                    return (
                      <div key={stage} style={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: '80px'
                      }}>
                        {/* Bar with value */}
                        <div style={{ 
                          width: '60px',
                          height: `${percentage * 3}px`,
                          backgroundColor: stageColors[stage as keyof typeof stageColors],
                          position: 'relative',
                          transition: 'height 0.5s ease'
                        }}>
                          {/* Value label */}
                          <span style={{ 
                            position: 'absolute',
                            top: '-25px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontSize: '14px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap'
                          }}>
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {/* X-axis labels */}
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-evenly',
                  marginTop: '10px',
                  paddingLeft: '40px',
                  paddingRight: '40px'
                }}>
                  {[1, 2, 3, 4].map(stage => {
                    const count = results.stageCounts.find(s => s.stage === stage)?.count || 0
                    return (
                      <div key={stage} style={{ 
                        textAlign: 'center',
                        width: '80px'
                      }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Stage {stage}</div>
                        <div style={{ fontSize: '12px', color: '#666', fontWeight: 'normal' }}>
                          ({count} {count === 1 ? 'leader' : 'leaders'})
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            
            {/* NEW: Interpretation Card */}
            {(() => {
              const interpretation = getStageDistributionInterpretation()
              if (!interpretation) return null
              
              return (
                <div className="mt-6 p-6 rounded-lg border-l-4" style={{
                  backgroundColor: interpretation.bgColor,
                  borderLeftColor: interpretation.borderColor
                }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{interpretation.icon}</span>
                        <h3 className="text-lg font-bold" style={{color: interpretation.textColor}}>
                          {interpretation.category}
                        </h3>
                        <span className="px-3 py-1 rounded-full text-sm font-medium text-white" style={{
                          backgroundColor: interpretation.pillColor
                        }}>
                          {stage12Percentage}% in Stages 1-2
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">
                        {interpretation.headline}
                      </h4>
                      <ul className="space-y-2 text-sm text-gray-700">
                        {interpretation.bullets.map((bullet, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Stage by Performance - Vertical Bar Chart with Interpretation */}
          <div className="bg-white p-6 rounded-lg shadow stage-by-performance-section">
            <h2 className="text-xl font-semibold mb-2">Stage by Performance</h2>
            <p className="text-sm text-gray-600 mb-4">
              Average performance percentile by stage (higher is better performance)
            </p>
            
            {/* Chart Container - YOUR EXISTING CHART */}
            <div style={{ position: 'relative', height: '350px', paddingLeft: '120px' }}>
              {/* Y-axis label */}
              <div style={{ 
                position: 'absolute',
                left: '5px',
                top: '50%',
                transform: 'translateY(-50%) rotate(-90deg)',
                transformOrigin: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#333',
                whiteSpace: 'nowrap'
              }}>
                Performance Percentile
              </div>
              
              {/* Main chart area */}
              <div style={{ height: '300px', position: 'relative', marginLeft: '20px' }}>
                {/* Y-axis scale */}
                <div style={{ 
                  position: 'absolute',
                  left: '-30px',
                  top: '0',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: '#666',
                  fontWeight: 'bold'
                }}>
                  <span>100%</span>
                  <span>75%</span>
                  <span>50%</span>
                  <span>25%</span>
                  <span>0%</span>
                </div>
                
                {/* Grid lines */}
                <div style={{ position: 'absolute', inset: '0' }}>
                  {[0, 25, 50, 75, 100].map(val => (
                    <div key={val} style={{ 
                      position: 'absolute',
                      left: '0',
                      right: '0',
                      top: `${100 - val}%`,
                      borderTop: '1px solid #e5e7eb'
                    }}></div>
                  ))}
                </div>
                
                {/* Bars container */}
                <div style={{ 
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-evenly',
                  height: '100%',
                  position: 'relative',
                  paddingLeft: '40px',
                  paddingRight: '40px'
                }}>
                  {results.averagePerformance.map(item => {
                    const stageCount = results.stageCounts.find(s => s.stage === item.stage)?.count || 0
                    
                    return (
                      <div key={item.stage} style={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: '80px'
                      }}>
                        {/* Bar with value */}
                        <div style={{ 
                          width: '60px',
                          height: `${item.average * 3}px`,
                          backgroundColor: stageColors[item.stage as keyof typeof stageColors],
                          position: 'relative',
                          transition: 'height 0.5s ease'
                        }}>
                          {/* Value label */}
                          <span style={{ 
                            position: 'absolute',
                            top: '-25px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontSize: '14px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap'
                          }}>
                            {item.average.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {/* X-axis labels */}
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-evenly',
                  marginTop: '10px',
                  paddingLeft: '40px',
                  paddingRight: '40px'
                }}>
                  {results.averagePerformance.map(item => {
                    const stageCount = results.stageCounts.find(s => s.stage === item.stage)?.count || 0
                    return (
                      <div key={item.stage} style={{ 
                        textAlign: 'center',
                        width: '80px'
                      }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Stage {item.stage}</div>
                        <div style={{ fontSize: '12px', color: '#666', fontWeight: 'normal' }}>
                          ({stageCount} {stageCount === 1 ? 'leader' : 'leaders'})
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            
            {/* NEW: Interpretation Card */}
            {(() => {
              const interpretation = getPerformanceGradientInterpretation()
              if (!interpretation) return null
              
              return (
                <div className="mt-6 p-6 rounded-lg border-l-4" style={{
                  backgroundColor: interpretation.bgColor,
                  borderLeftColor: interpretation.borderColor
                }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{interpretation.icon}</span>
                        <h3 className="text-lg font-bold" style={{color: interpretation.textColor}}>
                          {interpretation.category}
                        </h3>
                        <span className="px-3 py-1 rounded-full text-sm font-medium text-white" style={{
                          backgroundColor: interpretation.pillColor
                        }}>
                          {performanceGradient > 0 ? '+' : ''}{performanceGradient}pt gradient
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">
                        {interpretation.headline}
                      </h4>
                      <ul className="space-y-2 text-sm text-gray-700">
                        {interpretation.bullets.map((bullet, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )
            })()}
            
            <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-gray-700">
              <strong>Note:</strong> Performance percentile is calculated by converting ranks (Total People - Rank + 1) 
              and then computing the percentile position within each stage's distribution. Higher percentiles indicate better performance.
            </div>
          </div>

          {/* ALL YOUR REMAINING SECTIONS - Performance-Stage Distribution Scatterplot */}
          <div className="bg-white p-6 rounded-lg shadow misalignment-analysis-section">
            {/* YOUR EXISTING SCATTERPLOT CODE */}
          </div>

          {/* Performance-Stage Misalignment */}
          <div className="bg-white p-6 rounded-lg shadow misalignment-analysis-section">
            {/* YOUR EXISTING MISALIGNMENT MATRIX CODE */}
          </div>

          {/* Raw Data Table */}
          <div className="bg-white p-6 rounded-lg shadow raw-data-section">
            {/* YOUR EXISTING RAW DATA TABLE CODE */}
          </div>

          {/* NEW: Recommendations Section */}
          <div className="bg-white p-6 rounded-lg shadow recommendations-section">
            <h2 className="text-xl font-semibold mb-4">Development Roadmap</h2>
            <div className="grid gap-4">
              {getRecommendations().map((rec, idx) => (
                <div key={idx} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                      {idx + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">{rec.title}</h4>
                    <p className="text-sm text-gray-600">{rec.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Investment Guidelines</h4>
              <p className="text-sm text-blue-800">
                {getOverallStatus()?.status === 'CRITICAL' ? 
                  'Invest 3-5% of payroll in leadership development with 70% focused on Stage 1-2 acceleration' :
                 getOverallStatus()?.status === 'NEEDS ATTENTION' ? 
                  'Invest 2-3% of payroll with balanced focus across all stages' :
                  'Invest 1-2% of payroll focused on maintaining excellence and succession planning'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}