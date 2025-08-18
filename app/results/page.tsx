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
  rawData?: any[] // Add this line
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
      
      // Always include basic sections if they exist
      const basicSections = [
        { selector: '.completion-status-section', name: 'Completion Status' },
        { selector: '.leaders-by-stage-section', name: 'Leaders by Stage' },
        { selector: '.stage-by-performance-section', name: 'Stage by Performance' },
        { selector: '.misalignment-analysis-section', name: 'Misalignment Analysis' },
        { selector: '.business-unit-health-section', name: 'Business Unit Health' },
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
        const movementCards = document.querySelector('.mb-6.grid.grid-cols-2.sm\\:grid-cols-4.gap-3.sm\\:gap-4')
        if (movementCards) {
          sections.unshift({ element: movementCards, name: 'Movement Summary' })
        }
        
        // Add all comparison tables and charts
        const comparisonSections = document.querySelectorAll('.bg-white.p-4.sm\\:p-6.rounded-lg.shadow.mb-6')
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
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-8">Audit Results</h1>

      {/* Audit Selection */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
        <select
          value={selectedAudit}
          onChange={(e) => setSelectedAudit(e.target.value)}
          className="flex-1 p-2 border rounded text-sm sm:text-base"
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
          className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm sm:text-base"
        >
          {loading ? 'Loading...' : 'Refresh Results'}
        </button>
      </div>

      {/* Comparison Controls - Only show if organization has multiple rounds */}
      {hasMultipleRounds && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <h3 className="font-semibold text-blue-900 text-sm sm:text-base">
                📊 Comparison Analysis Available
              </h3>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-medium">
                Round {currentAuditInfo?.auditRound || 1} vs Round {organizationAudits[0]?.auditRound || 1}
              </span>
            </div>
            <button
              onClick={() => setCompareMode(!compareMode)}
              className={`px-3 sm:px-4 py-2 rounded font-medium transition-colors text-sm sm:text-base ${
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
              <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="flex-1">
                  <label className="text-xs sm:text-sm text-gray-700">Compare with previous audit:</label>
                  <select
                    value={selectedPreviousAudit}
                    onChange={(e) => setSelectedPreviousAudit(e.target.value)}
                    className="w-full mt-1 p-2 border rounded text-sm sm:text-base"
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
                  className="px-4 sm:px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 font-medium text-sm sm:text-base"
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
          <div className="text-lg sm:text-xl text-gray-600">Loading results...</div>
        </div>
      )}

      {/* Comparison Results - Pipeline Movement Analysis */}
      {compareMode && comparisonData && (
        <>
          {/* Movement Summary Cards */}
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Advanced</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">
                    {comparisonData.movements.promoted}
                  </p>
                </div>
                <span className="text-2xl sm:text-3xl">⬆️</span>
              </div>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Maintained</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">
                    {comparisonData.movements.maintained}
                  </p>
                </div>
                <span className="text-2xl sm:text-3xl">➡️</span>
              </div>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">New Hires</p>
                  <p className="text-xl sm:text-2xl font-bold text-purple-600">
                    {comparisonData.movements.newHires}
                  </p>
                </div>
                <span className="text-2xl sm:text-3xl">✨</span>
              </div>
            </div>
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Departures</p>
                  <p className="text-xl sm:text-2xl font-bold text-orange-600">
                    {comparisonData.movements.departures}
                  </p>
                </div>
                <span className="text-2xl sm:text-3xl">👋</span>
              </div>
            </div>
          </div>

          {/* Pipeline Movement Analysis */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-2">Pipeline Movement Analysis</h2>
            <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
              Track individual progression between stages from Round {comparisonData.previousAudit.round} to Round {comparisonData.currentAudit.round}
            </p>
            
            {/* Movement Table */}
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[700px] px-4 sm:px-0">
                <table className="min-w-full text-xs sm:text-sm">
                  <thead style={{ backgroundColor: '#071D49' }}>
                    <tr>
                      <th className="px-2 sm:px-4 py-2 text-left" style={{ color: 'white' }}>Employee</th>
                      <th className="px-2 sm:px-4 py-2 text-left" style={{ color: 'white' }}>Business Unit</th>
                      <th className="px-2 sm:px-4 py-2 text-center" style={{ color: 'white' }}>Previous Stage</th>
                      <th className="px-2 sm:px-4 py-2 text-center" style={{ color: 'white' }}>Current Stage</th>
                      <th className="px-2 sm:px-4 py-2 text-center" style={{ color: 'white' }}>Stage Change</th>
                      <th className="px-2 sm:px-4 py-2 text-center" style={{ color: 'white' }}>Previous Perf %</th>
                      <th className="px-2 sm:px-4 py-2 text-center" style={{ color: 'white' }}>Current Perf %</th>
                      <th className="px-2 sm:px-4 py-2 text-center" style={{ color: 'white' }}>Perf Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {comparisonData.comparisons
                      .filter(c => c.previousStage && c.currentStage)
                      .sort((a, b) => (b.stageChange || 0) - (a.stageChange || 0))
                      .map((comp, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-2 sm:px-4 py-2">{comp.name}</td>
                          <td className="px-2 sm:px-4 py-2">{comp.businessUnit}</td>
                          <td className="px-2 sm:px-4 py-2 text-center">
                            <span className="px-1 sm:px-2 py-1 rounded text-white text-xs font-medium"
                              style={{ backgroundColor: stageColors[comp.previousStage as keyof typeof stageColors] }}>
                              Stage {comp.previousStage}
                            </span>
                          </td>
                          <td className="px-2 sm:px-4 py-2 text-center">
                            <span className="px-1 sm:px-2 py-1 rounded text-white text-xs font-medium"
                              style={{ backgroundColor: stageColors[comp.currentStage as keyof typeof stageColors] }}>
                              Stage {comp.currentStage}
                            </span>
                          </td>
                          <td className="px-2 sm:px-4 py-2 text-center">
                            <span className={`px-1 sm:px-2 py-1 rounded text-xs font-medium ${
                              comp.stageChange! > 0 ? 'bg-green-100 text-green-800' :
                              comp.stageChange! < 0 ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {comp.stageChange! > 0 ? '+' : ''}{comp.stageChange}
                            </span>
                          </td>
                          <td className="px-2 sm:px-4 py-2 text-center">{comp.previousPerformance}%</td>
                          <td className="px-2 sm:px-4 py-2 text-center">{comp.currentPerformance}%</td>
                          <td className="px-2 sm:px-4 py-2 text-center">
                            <span className={`px-1 sm:px-2 py-1 rounded text-xs font-medium ${
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
          </div>

          {/* Comparison Charts - Leaders by Stage */}
          {compareMode && comparisonData && (
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow mb-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-2">Leaders by Stage - Comparison</h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
                Compare stage distribution between Round {comparisonData.previousAudit.round} and Round {comparisonData.currentAudit.round}
              </p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Round 1 Chart */}
                <div>
                  <h3 className="text-center font-semibold mb-4 text-gray-700 text-sm sm:text-base">
                    Round {comparisonData.previousAudit.round} - {new Date(comparisonData.previousAudit.date).toLocaleDateString()}
                  </h3>
                  <div className="relative" style={{ height: '300px', paddingLeft: '40px' }}>
                    {/* Y-axis scale for Round 1 */}
                    <div className="hidden sm:block" style={{ 
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
                  <h3 className="text-center font-semibold mb-4 text-gray-700 text-sm sm:text-base">
                    Round {comparisonData.currentAudit.round} - {new Date(comparisonData.currentAudit.date).toLocaleDateString()}
                  </h3>
                  <div className="relative" style={{ height: '300px', paddingLeft: '40px' }}>
                    {/* Y-axis scale for Round 2 */}
                    <div className="hidden sm:block" style={{ 
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
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
  <div className="bg-white p-4 sm:p-6 rounded-lg shadow mb-6">
    <h2 className="text-lg sm:text-xl font-semibold mb-2">Stage by Performance - Comparison</h2>
    <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
      Compare average performance by stage between Round {comparisonData.previousAudit.round} and Round {comparisonData.currentAudit.round}
    </p>
    
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      {/* Round 1 Chart */}
      <div>
        <h3 className="text-center font-semibold mb-4 text-gray-700 text-sm sm:text-base">
          Round {comparisonData.previousAudit.round} - Average Performance
        </h3>
        <div className="relative" style={{ height: '300px', paddingLeft: '40px' }}>
          {/* Y-axis scale for Round 1 */}
          <div className="hidden sm:block" style={{ 
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
        <h3 className="text-center font-semibold mb-4 text-gray-700 text-sm sm:text-base">
          Round {comparisonData.currentAudit.round} - Average Performance
        </h3>
        <div className="relative" style={{ height: '300px', paddingLeft: '40px' }}>
          {/* Y-axis scale for Round 2 */}
          <div className="hidden sm:block" style={{ 
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
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
    <div className="bg-white p-4 rounded-lg shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <h2 className="text-base sm:text-lg font-semibold text-gray-700">Export Options</h2>
      <div className="flex gap-3">
        <button
          onClick={exportToPDF}
          className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium flex items-center gap-2 transition-colors text-sm sm:text-base"
        >
          <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17h6M9 13h6M9 9h4" />
          </svg>
          <span className="hidden sm:inline">Export to PDF</span>
          <span className="sm:hidden">PDF</span>
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
          className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium flex items-center gap-2 transition-colors text-sm sm:text-base"
          style={{ background: '#5EC4B6' }}
        >
          <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <span className="hidden sm:inline">Export to CSV</span>
          <span className="sm:hidden">CSV</span>
        </button>
      </div>
    </div>
          {/* Completion Status */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow completion-status-section">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">
              Completion Status: {results.completedLeaders}/{results.totalLeaders} 
              ({Math.round((results.completedLeaders / results.totalLeaders) * 100)}%)
            </h2>
            <div className="space-y-2">
              {results.completionStatus.map((leader, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-2 bg-gray-50 rounded gap-2">
                  <span className="text-sm sm:text-base">{leader.name} ({leader.email})</span>
                  <span className={`px-2 py-1 rounded text-xs sm:text-sm ${
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

          {/* Leaders by Stage - Vertical Bar Chart */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow leaders-by-stage-section">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Leaders by Stage</h2>
            
            {/* Chart Container */}
            <div className="relative" style={{ height: '350px', paddingLeft: '60px' }}>
              {/* Y-axis label */}
              <div className="hidden sm:block" style={{ 
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
          </div>

          {/* Stage by Performance - Vertical Bar Chart */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow stage-by-performance-section">
            <h2 className="text-lg sm:text-xl font-semibold mb-2">Stage by Performance</h2>
            <p className="text-xs sm:text-sm text-gray-600 mb-4">
              Average performance percentile by stage (higher is better performance)
            </p>
            
            {/* Chart Container */}
            <div className="relative" style={{ height: '350px', paddingLeft: '60px' }}>
              {/* Y-axis label */}
              <div className="hidden sm:block" style={{ 
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
                  {[0, 25,50, 75, 100].map(val => (
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
           
           {/* Calculation note */}
           <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-gray-700">
             <strong>Note:</strong> Performance percentile is calculated by converting ranks (Total People - Rank + 1) 
             and then computing the percentile position within each stage's distribution. Higher percentiles indicate better performance.
           </div>
         </div>
{/* Performance-Stage Distribution Scatterplot */}
<div className="bg-white p-4 sm:p-6 rounded-lg shadow misalignment-analysis-section">
 <h2 className="text-lg sm:text-xl font-semibold mb-2">Performance-Stage Distribution</h2>
 <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
   Individual employee positioning by career stage and performance percentile (higher is better performance)
 </p>
 
 {/* Chart Container */}
 <div className="relative" style={{ height: '400px', paddingLeft: '60px' }}>
   {/* Y-axis label */}
   <div className="hidden sm:block" style={{ 
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
   <div style={{ height: '350px', position: 'relative', marginLeft: '20px' }}>
     {/* Y-axis scale */}
     <div style={{ 
       position: 'absolute',
       left: '-30px',
       top: '0',
       height: '300px',
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
     
     {/* Chart plot area */}
     <div style={{ height: '300px', position: 'relative' }}>
       {/* Grid lines */}
       <div style={{ position: 'absolute', inset: '0' }}>
         {/* Horizontal lines */}
         {[0, 25, 50, 75, 100].map(val => (
           <div key={`h-${val}`} style={{ 
             position: 'absolute',
             left: '0',
             right: '0',
             top: `${100 - val}%`,
             borderTop: '1px solid #e5e7eb'
           }}></div>
         ))}
         {/* Vertical lines for stages */}
         {[1, 2, 3, 4].map(stage => (
           <div key={`v-${stage}`} style={{ 
             position: 'absolute',
             top: '0',
             bottom: '0',
             left: `${((stage - 0.5) / 4) * 100}%`,
             borderLeft: '1px solid #e5e7eb'
           }}></div>
         ))}
         {/* Center reference lines */}
         <div style={{ 
           position: 'absolute',
           left: '50%',
           top: '0',
           bottom: '0',
           borderLeft: '2px dashed #9ca3af'
         }}></div>
         <div style={{ 
           position: 'absolute',
           left: '0',
           right: '0',
           top: '50%',
           borderTop: '2px dashed #9ca3af'
         }}></div>
       </div>
       
       {/* Quadrant backgrounds */}
       <div style={{ position: 'absolute', inset: '0' }}>
         {/* Top Left - High Performance, Low Stage */}
         <div style={{ 
           position: 'absolute',
           left: '0',
           top: '0',
           width: '50%',
           height: '50%',
           backgroundColor: '#F59E0B',
           opacity: 0.05
         }}></div>
         {/* Top Right - High Performance, High Stage */}
         <div style={{ 
           position: 'absolute',
           right: '0',
           top: '0',
           width: '50%',
           height: '50%',
           backgroundColor: '#10B981',
           opacity: 0.05
         }}></div>
         {/* Bottom Left - Low Performance, Low Stage */}
         <div style={{ 
           position: 'absolute',
           left: '0',
           bottom: '0',
           width: '50%',
           height: '50%',
           backgroundColor: '#6B7280',
           opacity: 0.05
         }}></div>
         {/* Bottom Right - Low Performance, High Stage */}
         <div style={{ 
           position: 'absolute',
           right: '0',
           bottom: '0',
           width: '50%',
           height: '50%',
           backgroundColor: '#EF4444',
           opacity: 0.05
         }}></div>
       </div>
       
       {/* Plot points */}
       {(results as any).rawData.map((emp: any, idx: number) => {
         // Calculate position
         const xPercent = ((emp.stage - 0.5) / 4) * 100
         const yPercent = emp.percentile
         
         // Determine color based on stage
         const dotColor = emp.stage === 1 ? '#E8B70B' : 
                         emp.stage === 2 ? '#ED1B34' : 
                         emp.stage === 3 ? '#0086D6' : '#071D49'
         
         return (
           <div
             key={idx}
             style={{
               position: 'absolute',
               left: `${xPercent}%`,
               top: `${100 - yPercent}%`,
               width: '12px',
               height: '12px',
               borderRadius: '50%',
               backgroundColor: dotColor,
               transform: 'translate(-50%, -50%)',
               border: '2px solid white',
               boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
               cursor: 'pointer',
               zIndex: 10
             }}
             className="hover:scale-150 transition-transform"
           />
         )
       })}
     </div>
     
     {/* X-axis labels */}
     <div style={{ 
       display: 'flex',
       justifyContent: 'space-around',
       marginTop: '10px',
       paddingLeft: '0px',
       paddingRight: '0px'
     }}>
       {[1, 2, 3, 4].map(stage => {
         const count = (results as any).rawData.filter((r: any) => r.stage === stage).length
         return (
           <div key={stage} style={{ 
             textAlign: 'center',
             flex: 1
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
 

</div>
         {/* Performance-Stage Misalignment */}
         <div className="bg-white p-4 sm:p-6 rounded-lg shadow misalignment-analysis-section">
           <h2 className="text-lg sm:text-xl font-semibold mb-2">Performance-Stage Misalignment Analysis</h2>
           <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
             Identifies talent opportunities and risks based on performance and career stage alignment
           </p>
           
           {/* Risk Matrix and Alert List */}
           <div className="flex flex-col lg:flex-row gap-6 lg:gap-12">
             {/* 2x2 Matrix */}
             <div className="flex-1">
               <h3 className="font-semibold mb-4 text-gray-800 text-sm sm:text-base">Talent Distribution Matrix</h3>
               <div className="text-xs sm:text-base" style={{ 
                 display: 'grid', 
                 gridTemplateColumns: 'minmax(40px, 80px) 1fr 1fr',
                 gridTemplateRows: '1fr 1fr 40px 40px', 
                 gap: '3px', 
                 height: '380px'
               }}>
                 {/* Y-axis label */}
                 <div style={{ 
                   gridRow: '1 / 3',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   writingMode: 'vertical-rl',
                   transform: 'rotate(180deg)',
                   fontSize: '14px',
                   fontWeight: 'bold',
                   backgroundColor: 'white',
                   color: '#374151',
                   letterSpacing: '0.05em',
                   borderRadius: '5px 0 0 5px'
                 }}>
                   PERFORMANCE
                 </div>
                 
                 {/* Top Left - High Performance, Low Stage */}
                 <div style={{ 
                   background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                   borderRadius: '6px',
                   padding: '20px',
                   display: 'flex',
                   flexDirection: 'column',
                   justifyContent: 'center',
                   alignItems: 'center',
                   boxShadow: '0 2px 4px rgba(251, 191, 36, 0.1)'
                 }}>
                   <div style={{ fontSize: '13px', fontWeight: '600', color: '#78350F', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                     High Potential
                   </div>
                   <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#F59E0B', margin: '8px 0' }}>
                     {(() => {
                       const rawData = (results as any).rawData || []
                       return rawData.filter((r: any) => 
                         (r.stage === 1 || r.stage === 2) && parseFloat(r.percentile) > 50
                       ).length
                     })()}
                   </div>
                   <div style={{ fontSize: '12px', color: '#92400E', textAlign: 'center' }}>
                     Ready to advance
                   </div>
                 </div>
                 
                 {/* Top Right - High Performance, High Stage */}
                 <div style={{ 
                   background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
                   borderRadius: '6px',
                   padding: '20px',
                   display: 'flex',
                   flexDirection: 'column',
                   justifyContent: 'center',
                   alignItems: 'center',
                   boxShadow: '0 2px 4px rgba(16, 185, 129, 0.1)'
                 }}>
                   <div style={{ fontSize: '13px', fontWeight: '600', color: '#064E3B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                     Top Performers
                   </div>
                   <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#10B981', margin: '8px 0' }}>
                     {(() => {
                       const rawData = (results as any).rawData || []
                       return rawData.filter((r: any) => 
                         (r.stage === 3 || r.stage === 4) && parseFloat(r.percentile) > 50
                       ).length
                     })()}
                   </div>
                   <div style={{ fontSize: '12px', color: '#065F46', textAlign: 'center' }}>
                     Well positioned
                   </div>
                 </div>
                 
                 {/* Bottom Left - Low Performance, Low Stage */}
                 <div style={{ 
                   background: 'linear-gradient(135deg, #F9FAFB 0%, #E5E7EB 100%)',
                   borderRadius: '6px',
                   padding: '20px',
                   display: 'flex',
                   flexDirection: 'column',
                   justifyContent: 'center',
                   alignItems: 'center',
                   boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                 }}>
                   <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                     Developing
                   </div>
                   <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#6B7280', margin: '8px 0' }}>
                     {(() => {
                       const rawData = (results as any).rawData || []
                       return rawData.filter((r: any) => 
                         (r.stage === 1 || r.stage === 2) && parseFloat(r.percentile) <= 50
                       ).length
                     })()}
                   </div>
                   <div style={{ fontSize: '12px', color: '#4B5563', textAlign: 'center' }}>
                     Develop or remove
                   </div>
                 </div>
                 
                 {/* Bottom Right - Low Performance, High Stage */}
                 <div style={{ 
                   background: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
                   borderRadius: '6px',
                   padding: '20px',
                   display: 'flex',
                   flexDirection: 'column',
                   justifyContent: 'center',
                   alignItems: 'center',
                   boxShadow: '0 2px 4px rgba(239, 68, 68, 0.1)'
                 }}>
                   <div style={{ fontSize: '13px', fontWeight: '600', color: '#7F1D1D', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                     At Risk
                   </div>
                   <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#EF4444', margin: '8px 0' }}>
                     {(() => {
                       const rawData = (results as any).rawData || []
                       return rawData.filter((r: any) => 
                         (r.stage === 3 || r.stage === 4) && parseFloat(r.percentile) <= 50
                       ).length
                     })()}
                   </div>
                   <div style={{ fontSize: '12px', color: '#991B1B', textAlign: 'center' }}>
                     Need support
                   </div>
                 </div>
                 
                 {/* X-axis stage labels row */}
                 <div></div>
                 <div style={{ 
                   display: 'flex', 
                   alignItems: 'center', 
                   justifyContent: 'center', 
                   fontSize: '13px',
                   fontWeight: '500',
                   color: '#4B5563',
                   backgroundColor: 'white'
                 }}>
                   Early Stage (1-2)
                 </div>
                 <div style={{ 
                   display: 'flex', 
                   alignItems: 'center', 
                   justifyContent: 'center', 
                   fontSize: '13px',
                   fontWeight: '500',
                   color: '#4B5563',
                   backgroundColor: 'white'
                 }}>
                   Senior Stage (3-4)
                 </div>
                 
                 {/* X-axis main label row */}
                 <div style={{ gridColumn: '2 / 4', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', color: '#374151', letterSpacing: '0.05em', paddingTop: '0px' }}>
                   CAREER STAGE
                 </div>
               </div>
             </div>
             
             {/* Action Items */}
             <div className="flex-1">
               <h3 className="font-semibold mb-4 text-gray-800 text-sm sm:text-base">Priority Actions</h3>
               <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                 {(() => {
                   const rawData = (results as any).rawData || []
                   const alerts: any[] = []
                   
                   // High performers in Stage 1-2
                   rawData.filter((r: any) => 
                     (r.stage === 1 || r.stage === 2) && parseFloat(r.percentile) > 75
                   ).forEach((r: any) => {
                     alerts.push({
                       type: 'opportunity',
                       employee: r.employee,
                       title: r.title,
                       stage: r.stage,
                       percentile: r.percentile,
                       message: `Consider for advancement`,
                       icon: '⬆️',
                       bgColor: '#FEF3C7',
                       borderColor: '#F59E0B'
                     })
                   })
                   
                   // Low performers in Stage 3-4
                   rawData.filter((r: any) => 
                     (r.stage === 3 || r.stage === 4) && parseFloat(r.percentile) < 25
                   ).forEach((r: any) => {
                     alerts.push({
                       type: 'risk',
                       employee: r.employee,
                       title: r.title,
                       stage: r.stage,
                       percentile: r.percentile,
                       message: `Development needed`,
                       icon: '⚠️',
                       bgColor: '#FEE2E2',
                       borderColor: '#EF4444'
                     })
                   })
                   
                   if (alerts.length === 0) {
                     return (
                       <div className="text-center py-8">
                         <div className="text-gray-400 mb-2">
                           <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                           </svg>
                         </div>
                         <div className="text-gray-500 font-medium text-sm sm:text-base">
                           No critical misalignments detected
                         </div>
                         <div className="text-gray-400 text-xs sm:text-sm mt-1">
                           All employees appear appropriately positioned
                         </div>
                       </div>
                     )
                   }
                   
                   return alerts.map((alert, idx) => (
                     <div key={idx} className="rounded-lg border-2 p-3 sm:p-4 transition-all hover:shadow-md" style={{ 
                       backgroundColor: alert.bgColor,
                       borderColor: alert.borderColor
                     }}>
                       <div className="flex justify-between items-start">
                         <div className="flex-1">
                           <div className="flex items-center gap-2 mb-1">
                             <span className="text-lg sm:text-xl">{alert.icon}</span>
                             <span className="font-semibold text-gray-800 text-sm sm:text-base">{alert.employee}</span>
                           </div>
                           <div className="text-xs sm:text-sm text-gray-600 mb-2">{alert.title}</div>
                           <div className="flex gap-2 sm:gap-4 text-xs">
                             <span className="px-2 py-1 rounded bg-white bg-opacity-60">
                               Stage {alert.stage}
                             </span>
                             <span className="px-2 py-1 rounded bg-white bg-opacity-60 font-medium">
                               {alert.percentile}% Performance
                             </span>
                           </div>
                         </div>
                         <div className="text-xs sm:text-sm font-medium" style={{ color: alert.borderColor }}>
                           {alert.message}
                         </div>
                       </div>
                     </div>
                   ))
                 })()}
               </div>
             </div>
           </div>
           
           {/* Calculation note */}
           <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-gray-700">
             <strong>Note:</strong> The matrix categorizes employees based on their career stage (1-2 = Early, 3-4 = Senior) 
             and performance percentile (50% or below = Lower, above 50% = Higher). Priority actions highlight high performers in early stages 
             (above 75th percentile in stages 1-2) as advancement opportunities and low performers in senior stages 
             (below 25th percentile in stages 3-4) as development needs.
           </div>
         </div>

         {/* Raw Data Table */}
         <div className="bg-white p-4 sm:p-6 rounded-lg shadow raw-data-section">
           <div className="flex justify-between items-center mb-4">
             <h2 className="text-lg sm:text-xl font-semibold">Raw Data</h2>
           </div>
           
           <div className="overflow-x-auto -mx-4 sm:mx-0">
             <div className="min-w-[600px] px-4 sm:px-0">
               <table className="min-w-full text-xs sm:text-sm">
                 <thead style={{ backgroundColor: '#071D49' }}>
                   <tr>
                     <th className="px-2 sm:px-4 py-2 text-left" style={{ color: 'white' }}>Leader</th>
                     <th className="px-2 sm:px-4 py-2 text-left" style={{ color: 'white' }}>Employee</th>
                     <th className="px-2 sm:px-4 py-2 text-left" style={{ color: 'white' }}>Title</th>
                     <th className="px-2 sm:px-4 py-2 text-left" style={{ color: 'white' }}>Business Unit</th>
                     <th className="px-2 sm:px-4 py-2 text-center" style={{ color: 'white' }}>Stage</th>
                     <th className="px-2 sm:px-4 py-2 text-center" style={{ color: 'white' }}>Rank</th>
                     <th className="px-2 sm:px-4 py-2 text-center" style={{ color: 'white' }}>Percentile</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-200">
                   {(results as any).rawData && (results as any).rawData.length > 0 ? (
                     (results as any).rawData.map((row: any, idx: number) => (
                       <tr key={idx} className="hover:bg-gray-50">
                         <td className="px-2 sm:px-4 py-2 text-left">{row.leader}</td>
                         <td className="px-2 sm:px-4 py-2 text-left">{row.employee}</td>
                         <td className="px-2 sm:px-4 py-2 text-left">{row.title}</td>
                         <td className="px-2 sm:px-4 py-2 text-left">{row.businessUnit}</td>
                         <td className="px-2 sm:px-4 py-2 text-center">{row.stage}</td>
                         <td className="px-2 sm:px-4 py-2 text-center">{row.rank}</td>
                         <td className="px-2 sm:px-4 py-2 text-center">{row.percentile}%</td>
                       </tr>
                     ))
                   ) : (
                     <tr>
                       <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                         No ratings have been submitted yet
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
           </div>
         </div>
       </div>
     )}
   </div>
 )
}