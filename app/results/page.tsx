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
    1: '#E8B70B',  // Yello
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

          {/* Educational Introduction Section */}
<div className="bg-white p-8 rounded-lg shadow mb-6">
  <h2 className="text-2xl font-bold mb-6 text-gray-900">Understanding Your Leadership Pipeline Audit Results</h2>
  
  <div className="prose max-w-none space-y-6 text-gray-700">
    <p className="text-lg leading-relaxed">
      Every organization faces a fundamental challenge: how do we develop leaders who can drive value today while building capability for tomorrow? The answer lies not in traditional hierarchical thinking but in understanding how professionals progress through their careers—and how organizations often misunderstand and even get in the way of that progression.
    </p>

    <div>
      <h3 className="text-xl font-semibold mb-4 text-gray-900">What the Research Tells Us about Careers and Performance</h3>
      <p className="mb-4">
        Consider what the research reveals about careers:
      </p>
      
      {/* Video embed */}
      <div className="my-6">
        <video 
          controls 
          className="w-full rounded-lg shadow-lg"
          style={{ maxWidth: '800px', margin: '0 auto', display: 'block' }}
        >
          <source src="/expectations3.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

      <div className="space-y-4 mt-6">
        <ul className="space-y-1 list-disc ml-4 pl-5">
  <li>
    <strong>Aggregate performance peaks at age 40, then declines. </strong> It is noteworthy that individual high performers do not follow this same pattern—some individuals become more valuable as they get older. We need to understand what they do. 
  </li>
  <li>
    <strong>Becoming a manager follows a similar pattern—performance declines just a little later.</strong> Becoming a manager does not solve performance decline; it just delays it a few years.
  </li>
  <li>
    <strong>Individual top performers become more valuable over time.</strong> Clearly, age is not the primary factor in remaining a high performer. High performers change the nature of their contributions over time.
  </li>
  <li>
    <strong>•	Meanwhile, compensation increases over time.</strong> This misalignment creates the conditions where compensation is not tied to performance; it’s generally tied to seniority.
  </li>
</ul>
        <p>
          In summary, age and seniority are important factors in becoming a high performer. Over time expectations for performance increase and high performers change the nature of their contributions. Those who are able to change the way they contribute are able to remain high performers.
        </p>
      </div>
    </div>

    <div>
      <h3 className="text-xl font-semibold mb-4 text-gray-900">The Career Stages Framework: A Better Model</h3>
      <p className="mb-4">
        The solution comes from decades of research by Gene Dalton, Paul Thompson, and our team at RBL Group. Rather than viewing careers through age or tenure, we must understand progression through stages of development. Each stage represents a shift in how professionals create value. At each stage transition, people must stop what makes them a high performer at that stage and take on new knowledge, skills, and perspective to be effective.
      </p>
      
      <div className="space-y-6">
        <div className="pl-4 border-l-4 border-yellow-500">
          <h4 className="font-semibold text-gray-900 mb-2">Stage 1: Contributes Dependently</h4>
          <p className="text-gray-700">
            Professionals at this stage depend on others for direction and support. They work on portions of larger projects, focus on routine tasks, and learn "how we do things around here." They're building technical competence but haven't yet developed independence. Without strong technical skills, they need guidance about what to do and how to do it. It’s not possible to stay in stage 1 for an entire career. An individual in stage 1 must become an individual contributor or face lack of relevance and missed expectations.
          </p>
        </div>

        <div className="pl-4 border-l-4 border-red-500">
          <h4 className="font-semibold text-gray-900 mb-2">Stage 2: Contributes Independently</h4>
          <p className="text-gray-700">
            These professionals have become experts in their domain. They work independently, take responsibility for entire projects, and are considered credible specialists. They view work through the lens of competence and often compete with others in similar roles. While technically proficient, they tend to micromanage rather than develop others, focusing on their individual expertise rather than organizational capability. An individual can be a high performer in stage 2 but to do so they must invest in staying current in their technical area. This is difficult but doable over time.
          </p>
        </div>

        <div className="pl-4 border-l-4 border-blue-500">
          <h4 className="font-semibold text-gray-900 mb-2">Stage 3: Contributes through Others</h4>
          <p className="text-gray-700">
            The shift to Stage 3 represents a fundamental transformation from individual expert to organizational leader. These professionals have moved from a focus on self to a focus on ensuring team success. They influence others, integrate across multiple areas of expertise, and build both internal and external networks. They coach, mentor, and develop others while representing their workgroup to external stakeholders. They understand organizational culture and can navigate it to get things done. Individuals in Stage 3 are typically considered to be high performers.
          </p>
        </div>

        <div className="pl-4 border-l-4" style={{ borderColor: '#071D49' }}>
          <h4 className="font-semibold text-gray-900 mb-2">Stage 4: Contributes through Enterprise</h4>
          <p className="text-gray-700">
            Stage 4 leaders direct the business itself. They set strategic direction, control organizational resources, and use power rather than just influence. They see how functions, geographies, and operating units fit together to serve the enterprise. From the outside, they represent the entire organization. Their relationship with talent shifts from mentoring to testing future leaders for senior roles. They sponsor key people and shape organizational capability for the future. Individuals in Stage 4 are typically perceived as high performers. 
          </p>
        </div>
      </div>
    </div>

    <div>
      <h3 className="text-xl font-semibold mb-4 text-gray-900">What This Means for Your Pipeline Audit</h3>
      <p className="mb-4">
        Many organizations discover a troubling reality when they honestly assess their leadership pipeline: they're dramatically overweighted in Stages 1 and 2. The implication of this is leaders who don’t coach and develop their people and also don’t consider the needs of the external customer. The research suggests an optimal distribution looks quite different from what most organizations achieve when they first do a pipeline audit:
      </p>

      {/* Optimal Distribution Chart */}
      <div className="my-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
        <h4 className="text-center font-semibold mb-6 text-gray-800">Optimal Leadership Distribution</h4>
        
        <div style={{ position: 'relative', height: '350px', paddingLeft: '120px' }}>
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
          
          <div style={{ height: '300px', position: 'relative', marginLeft: '20px' }}>
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
            
            <div style={{ 
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-evenly',
              height: '100%',
              position: 'relative',
              paddingLeft: '40px',
              paddingRight: '40px'
            }}>
              {/* Stage 1 - 0% */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '80px' }}>
                <div style={{
                  width: '60px',
                  height: '0px', // 0% * 3
                  backgroundColor: '#E8B70B',
                  position: 'relative',
                  transition: 'height 0.5s ease'
                }}>
                  <span style={{
                    position: 'absolute',
                    top: '-25px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '14px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap'
                  }}>
                    0%
                  </span>
                </div>
              </div>
              
              {/* Stage 2 - 0% */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '80px' }}>
                <div style={{
                  width: '60px',
                  height: '0px', // 0% * 3
                  backgroundColor: '#ED1B34',
                  position: 'relative',
                  transition: 'height 0.5s ease'
                }}>
                  <span style={{
                    position: 'absolute',
                    top: '-25px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '14px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap'
                  }}>
                    0%
                  </span>
                </div>
              </div>
              
              {/* Stage 3 - 90% */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '80px' }}>
                <div style={{
                  width: '60px',
                  height: '270px', // 90% * 3
                  backgroundColor: '#0086D6',
                  position: 'relative',
                  transition: 'height 0.5s ease'
                }}>
                  <span style={{
                    position: 'absolute',
                    top: '-25px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '14px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap'
                  }}>
                    90%
                  </span>
                </div>
              </div>
              
              {/* Stage 4 - 10% */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '80px' }}>
                <div style={{
                  width: '60px',
                  height: '30px', // 10% * 3
                  backgroundColor: '#071D49',
                  position: 'relative',
                  transition: 'height 0.5s ease'
                }}>
                  <span style={{
                    position: 'absolute',
                    top: '-25px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '14px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap'
                  }}>
                    10%
                  </span>
                </div>
              </div>
            </div>
            
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-evenly',
              marginTop: '10px',
              paddingLeft: '40px',
              paddingRight: '40px'
            }}>
              <div style={{ textAlign: 'center', width: '80px' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Stage 1</div>
                <div style={{ fontSize: '12px', color: '#666', fontWeight: 'normal' }}>Dependent</div>
              </div>
              <div style={{ textAlign: 'center', width: '80px' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Stage 2</div>
                <div style={{ fontSize: '12px', color: '#666', fontWeight: 'normal' }}>Independent</div>
              </div>
              <div style={{ textAlign: 'center', width: '80px' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Stage 3</div>
                <div style={{ fontSize: '12px', color: '#666', fontWeight: 'normal' }}>Through Others</div>
              </div>
              <div style={{ textAlign: 'center', width: '80px' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Stage 4</div>
                <div style={{ fontSize: '12px', color: '#666', fontWeight: 'normal' }}>Through Enterprise</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-6">
        This optimal distribution reflects a crucial insight: <strong>organizations create the most value when their leaders operate at Stages 3 and 4—contributing through others and contributing through the enterprise.</strong> The most common gap is with Stage 3 leaders because Stage 3 is where leverage happens, where expertise has transformed into organizational capability.
      </p>
      <br />
      <p>
        Yet most organizations find themselves with too many leaders in Stages 1 and 2. They have individual contributors trying to compete in a world that demands collaborative leadership. This drives poor employee engagement, strategy execution failures, innovation stalls, and lessened customer relationships. They lack the Stage 3 leaders who translate strategy into action, who build the networks and relationships that create value, who develop the next generation of talent.
      </p>
       <br />
      <p>
        The Pipeline Audit you're about to review reveals whether your organization has the leadership capability to deliver on its promises to stakeholders. It shows whether you're building an organization that’s able to grow and adapt, or one that's constrained by its own leadership limitations.
      </p>
    </div>
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
          {/* Leaders by Stage - Vertical Bar Chart */}
          <div className="bg-white p-6 rounded-lg shadow leaders-by-stage-section">
            <h2 className="text-xl font-semibold mb-6">Leaders by Stage</h2>
            
            {/* Chart Container */}
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

            {/* Interpretation Card */}
            {/* Interpretation Card */}
{/* Interpretation Card */}
            <div className="mt-6 p-6 bg-white rounded-lg shadow" style={{
              border: `2px solid ${(() => {
                const stage1_2_percentage = results.stageCounts
                  .filter(s => s.stage === 1 || s.stage === 2)
                  .reduce((sum, s) => sum + s.count, 0) / 
                  results.stageCounts.reduce((sum, s) => sum + s.count, 0) * 100
                
                if (stage1_2_percentage >= 60) return '#EF4444'
                if (stage1_2_percentage >= 11) return '#F59E0B'
                return '#10B981'
              })()}`
            }}>
  <div className="flex items-start justify-between">
    <div className="flex-1">
      <div className="flex items-center gap-3 mb-2">
        <h3 className="text-lg font-bold" style={{
          color: (() => {
            const stage1_2_percentage = results.stageCounts
              .filter(s => s.stage === 1 || s.stage === 2)
              .reduce((sum, s) => sum + s.count, 0) / 
              results.stageCounts.reduce((sum, s) => sum + s.count, 0) * 100
            
            if (stage1_2_percentage >= 60) return '#991B1B'
            if (stage1_2_percentage >= 11) return '#92400E'
            return '#065F46'
          })()
        }}>
          {(() => {
            const stage1_2_percentage = results.stageCounts
              .filter(s => s.stage === 1 || s.stage === 2)
              .reduce((sum, s) => sum + s.count, 0) / 
              results.stageCounts.reduce((sum, s) => sum + s.count, 0) * 100
            
            if (stage1_2_percentage >= 60) return 'CRITICAL'
            if (stage1_2_percentage >= 11) return 'NEEDS ATTENTION'
            return 'OPTIMIZED'
          })()}
        </h3>
        <span className="px-3 py-1 rounded-full text-sm font-medium text-white" style={{
          backgroundColor: (() => {
            const stage1_2_percentage = results.stageCounts
              .filter(s => s.stage === 1 || s.stage === 2)
              .reduce((sum, s) => sum + s.count, 0) / 
              results.stageCounts.reduce((sum, s) => sum + s.count, 0) * 100
            
            if (stage1_2_percentage >= 60) return '#EF4444'
            if (stage1_2_percentage >= 11) return '#F59E0B'
            return '#10B981'
          })()
        }}>
          {(results.stageCounts
            .filter(s => s.stage === 1 || s.stage === 2)
            .reduce((sum, s) => sum + s.count, 0) / 
            results.stageCounts.reduce((sum, s) => sum + s.count, 0) * 100).toFixed(1)}% in Stages 1-2
        </span>
      </div>
      <h4 className="font-semibold text-gray-900 mb-3">
        {(() => {
          const stage1_2_percentage = results.stageCounts
            .filter(s => s.stage === 1 || s.stage === 2)
            .reduce((sum, s) => sum + s.count, 0) / 
            results.stageCounts.reduce((sum, s) => sum + s.count, 0) * 100
          
          if (stage1_2_percentage >= 60) return 'Leadership Readiness Crisis - Immediate Development Required'
          if (stage1_2_percentage >= 11) return 'Leadership Development Gaps - Acceleration Needed'
          return 'Strong Leadership Maturity - Ready to Scale'
        })()}
      </h4>
      
      <div className="text-sm text-gray-700 space-y-3">
        {(() => {
          const stage1_2_percentage = results.stageCounts
            .filter(s => s.stage === 1 || s.stage === 2)
            .reduce((sum, s) => sum + s.count, 0) / 
            results.stageCounts.reduce((sum, s) => sum + s.count, 0) * 100
          
          if (stage1_2_percentage >= 60) {
            return (
              <>
                <p>Your organization faces significant risk with the majority of leaders unprepared for their current roles. When over 60% of leaders operate at Stages 1-2, they lack the fundamental capabilities to provide direction and instead depend on others for guidance. This creates a cascade of challenges:</p>
                <ul className="space-y-1 list-disc ml-4 pl-5">
                    <li>Growth becomes unlikely as leaders cannot execute expansion strategies</li>
                    <li>Strategic execution is compromised with leaders neither aligned nor capable of delivery</li>
                    <li>Employee engagement suffers under leaders who struggle to inspire</li>
                    <li>Customer relationships deteriorate as leaders cannot maintain service standards or respond to market needs</li>
                </ul>
                <p>The impact is systemic—underdeveloped leaders cannot develop others, perpetuating the crisis across the organization.</p>
              </>
            )
          }
          if (stage1_2_percentage >= 11) {
            return (
              <>
                <p>Your organization has a notable portion of leaders who need development support to be fully effective. While the majority operate appropriately at Stages 3-4, having this many leaders at Stages 1-2 creates uneven capability across the organization:</p>
                <ul className="space-y-1 list-disc ml-4 pl-5">
                    <li>Growth potential exists but faces challenges as some leaders aren't ready to scale operations</li>
                    <li>Strategic alignment becomes inconsistent with pockets of underdeveloped leadership</li>
                    <li>Employee engagement varies significantly between teams with strong versus weak leaders</li>
                    <li>Customer satisfaction is at risk in areas led by Stage 1-2 leaders who lack strategic thinking</li>
                </ul>
                
              </>
            )
          }
          return (
            <>
              <p>Your leadership team is appropriately developed and positioned for success. With over 90% of leaders at Stages 3-4, your organization has the critical mass to grow and scale effectively:</p>
              <ul className="space-y-1 list-disc ml-4 pl-5">
                <li>Leaders are aligned and capable of delivering on strategic objectives autonomously</li>
                <li>Employee engagement thrives under mature leaders who create positive, developmental work environments</li>
                <li>Customer relationships benefit from leaders who think strategically and innovate solutions</li>
                <li>Growth strategies can be pursued aggressively with confidence in execution</li>
            </ul>
              <p>This represents normal, healthy transition as new leaders are promoted and rapidly developed. Your organization can leverage this leadership strength for competitive advantage.</p>
            </>
          )
        })()}
      </div>
    </div>
  </div>
</div>
            
          </div>
          


          {/* Stage by Performance - Vertical Bar Chart */}
          <div className="bg-white p-6 rounded-lg shadow stage-by-performance-section">
            <h2 className="text-xl font-semibold mb-2">Stage by Performance</h2>
            <p className="text-sm text-gray-600 mb-4">
              Average performance percentile by stage (higher is better performance)
            </p>
            
            {/* Chart Container */}
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
            {/* Calculation note */}
            <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-gray-700">
              <strong>Note:</strong> Performance percentile is calculated by converting ranks (Total People - Rank + 1) 
              and then computing the percentile position within each stage's distribution. Higher percentiles indicate better performance.
            </div>

          </div>


          {/* Business Unit Stage by Performance */}
          {/* Business Unit Stage by Performance */}
          
<div className="bg-white p-6 rounded-lg shadow business-unit-health-section">
  <h2 className="text-xl font-semibold mb-2">Business Unit Stage by Performance</h2>
  <p className="text-sm text-gray-600 mb-4">
    Stage distribution and average performance by business unit
  </p>
  
  <div className="space-y-6">
    {(() => {
      const rawData = (results as any).rawData || []
      const businessUnits: string[] = Array.from(new Set(rawData.map((r: any) => r.businessUnit)))
      
      if (businessUnits.length === 0) {
        return (
          <div className="text-center py-8 text-gray-500">
            No business unit data available
          </div>
        )
      }
      
      return businessUnits.map(unit => {
        const unitData = rawData.filter((r: any) => r.businessUnit === unit)
        const stage1 = unitData.filter((r: any) => r.stage === 1).length
        const stage2 = unitData.filter((r: any) => r.stage === 2).length
        const stage3 = unitData.filter((r: any) => r.stage === 3).length
        const stage4 = unitData.filter((r: any) => r.stage === 4).length
        const total = unitData.length
        
        // Calculate percentages
        const stage1Pct = total > 0 ? (stage1 / total) * 100 : 0
        const stage2Pct = total > 0 ? (stage2 / total) * 100 : 0
        const stage3Pct = total > 0 ? (stage3 / total) * 100 : 0
        const stage4Pct = total > 0 ? (stage4 / total) * 100 : 0
        
        // Calculate average performance
        const avgPerformance = unitData.reduce((sum: number, r: any) => 
          sum + parseFloat(r.percentile), 0) / unitData.length
        
        return (
          <div key={unit} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 className="font-semibold text-lg">{unit || 'Unspecified'}</h3>
              <div className="flex gap-4 text-sm">
                <span className="text-gray-600">Total: <span className="font-semibold">{total}</span> leaders</span>
                <span className={`font-medium ${avgPerformance >= 60 ? 'text-green-600' : avgPerformance >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                  Avg Performance: {avgPerformance.toFixed(1)}%
                </span>
              </div>
            </div>
            
            {/* Vertical Bar Chart Container */}
            <div style={{ position: 'relative', height: '250px', paddingLeft: '40px' }}>
              {/* Main chart area */}
              <div style={{ height: '200px', position: 'relative', marginLeft: '10px' }}>
                {/* Y-axis scale */}
                <div style={{ 
                  position: 'absolute',
                  left: '-30px',
                  top: '0',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  fontSize: '11px',
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
                  paddingLeft: '30px',
                  paddingRight: '30px'
                }}>
                  {[1, 2, 3, 4].map(stage => {
                    const count = stage === 1 ? stage1 : stage === 2 ? stage2 : stage === 3 ? stage3 : stage4
                    const percentage = stage === 1 ? stage1Pct : stage === 2 ? stage2Pct : stage === 3 ? stage3Pct : stage4Pct
                    const stageColor = stage === 1 ? '#E8B70B' : stage === 2 ? '#ED1B34' : stage === 3 ? '#0086D6' : '#071D49'
                    
                    return (
                      <div key={stage} style={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: '60px'
                      }}>
                        {/* Bar with value */}
                        <div style={{ 
                          width: '45px',
                          height: `${percentage * 2}px`,
                          backgroundColor: stageColor,
                          position: 'relative',
                          transition: 'height 0.5s ease'
                        }}>
                          {/* Value label */}
                          <span style={{ 
                            position: 'absolute',
                            top: '-22px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontSize: '13px',
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
                  paddingLeft: '30px',
                  paddingRight: '30px'
                }}>
                  {[1, 2, 3, 4].map(stage => {
                    const count = stage === 1 ? stage1 : stage === 2 ? stage2 : stage === 3 ? stage3 : stage4
                    return (
                      <div key={stage} style={{ 
                        textAlign: 'center',
                        width: '60px'
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold' }}>Stage {stage}</div>
                        <div style={{ fontSize: '11px', color: '#666', fontWeight: 'normal' }}>
                          ({count} {count === 1 ? 'leader' : 'leaders'})
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )
      })
    })()}
  </div>
</div>
          {/* Recommendations Content */}
          {/*
              <div className="space-y-6">
                {(() => {
                  const stage1_2_percentage = results.stageCounts
                    .filter(s => s.stage === 1 || s.stage === 2)
                    .reduce((sum, s) => sum + s.count, 0) /
                    results.stageCounts.reduce((sum, s) => sum + s.count, 0) * 100

                  if (stage1_2_percentage >= 60) {
                    // CRITICAL
                    return (
                      <>
                        <div className="p-6 bg-white rounded-lg" style={{ border: '2px solid #EF4444' }}>
                          <h3 className="font-bold text-lg mb-4 text-red-900">Immediate Leadership Acceleration Required</h3>

                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2">1. Build Business Case for Leadership</h4>
                              <p className="text-sm text-gray-700 ml-4">Document the cost of leadership gaps on stakeholder value. Calculate the impact on customer retention, employee engagement scores, and investor confidence. Present this case to the board within 30 days to secure funding and executive sponsorship for transformation.</p>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">2. Define Leadership Brand Standards</h4>
                              <p className="text-sm text-gray-700 ml-4">Establish what Stage 3 readiness looks like in your organization. Create a focused competency model highlighting the key behaviors that differentiate Stage 3 from Stage 2. Use RBL's Leadership Code as the foundation: Shape the Future, Make Things Happen, Engage Today's Talent, Build the Next Generation, and Invest in Yourself.</p>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">3. Conduct Comprehensive Assessment</h4>
                              <p className="text-sm text-gray-700 ml-4">Deploy the organizational Leadership Brand Audit to assess your collective leadership capability. Use the Leadership Code 360 assessment for all leaders to establish baseline capabilities. For individual Stage 1-2 leaders in senior positions, add RBL's MENTOR battery of psychometric assessments to identify development potential and readiness for acceleration. Create heat maps showing capability gaps by business unit.</p>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">4. Deploy Intensive Development Interventions</h4>
                              <ul className="text-sm text-gray-700 ml-4 space-y-1">
                                <li>Based on assessment results, categorize Stage 1-2 leaders into three groups: Fast-track (high potential for Stage 3), Develop (need support but viable), and Transition (may need alternative roles or career paths)</li>
                                <li>Enroll all high-potential Stage 2 leaders in RBL's Leadership Code Academy</li>
                                <li>Implement executive coaching using RBL's "because of/so that" methodology</li>
                                <li>Create action learning projects tied directly to business challenges</li>
                                <li>Establish Stage 4 mentorship for every viable Stage 1-2 leader</li>
                              </ul>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">5. Track 90-Day Progression Metrics</h4>
                              <p className="text-sm text-gray-700 ml-4">Measure weekly progression indicators: behavioral change observations, business metric improvements, and stakeholder feedback. Use RBL's Organization Guidance System to track ROI on development investments.</p>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">6. Communicate Transparently</h4>
                              <p className="text-sm text-gray-700 ml-4">Share the leadership development plan with stakeholders. Provide monthly progress updates to employees, quarterly updates to customers, and include leadership development metrics in investor communications.</p>
                            </div>
                          </div>

                          <div className="mt-6 p-4 bg-red-50 rounded-lg">
                            <p className="text-sm font-semibold text-red-900">Investment Required: 3-5% of payroll, with 70% focused on Stage 1-2 acceleration</p>
                          </div>
                        </div>
                      </>
                    )


                  } else if (stage1_2_percentage >= 11) {
                    // NEEDS ATTENTION
                    return (
                      <>
                        <div className="p-6 bg-white rounded-lg" style={{ border: '2px solid #F59E0B' }}>
                          <h3 className="font-bold text-lg mb-4 text-yellow-900">Targeted Development Enhancement</h3>

                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2">1. Strengthen the Business Case</h4>
                              <p className="text-sm text-gray-700 ml-4">Articulate how closing the Stage 2-3 gap will improve competitive advantage. Link leadership development to strategic priorities like innovation, customer experience, or operational excellence. Use benchmarking data to show the opportunity cost of the current state.</p>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">2. Refine Your Leadership Brand</h4>
                              <p className="text-sm text-gray-700 ml-4">Develop a clear statement: "Leaders at [company] are known for [3 differentiators] so that we can deliver [stakeholder outcomes]." Ensure this brand connects to your customer promise and differentiates you from competitors.</p>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">3. Implement Systematic Assessment</h4>
                              <p className="text-sm text-gray-700 ml-4">Deploy annual Leadership Brand Audit at the organizational level. Use RBL's stratified 360 assessment tools for individual leaders (different for Stage 2 vs Stage 3). For Stage 1-2 leaders in critical roles, consider MENTOR psychometric assessments to guide development planning.</p>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">4. Create Targeted Development Pathways</h4>
                              <ul className="text-sm text-gray-700 ml-4 space-y-1">
                                <li>Implement RBL's Leadership Code Academy for Stage 2 leaders</li>
                                <li>Design 70-20-10 development plans: job experiences, coaching, and training</li>
                                <li>Create leadership cohorts for peer learning and accountability</li>
                                <li>Establish clear "ready now" criteria for Stage 3 advancement</li>
                              </ul>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">5. Measure Development ROI</h4>
                              <p className="text-sm text-gray-700 ml-4">Track progression rates from Stage 2 to 3, time to proficiency, and business impact of newly advanced Stage 3 leaders. Monitor leading indicators like engagement scores and customer satisfaction by leader stage.</p>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">6. Build Leadership Reputation</h4>
                              <p className="text-sm text-gray-700 ml-4">Share success stories internally and externally. Include leadership capability in talent acquisition materials. Feature leadership development in annual reports as a competitive advantage.</p>
                            </div>
                          </div>

                          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                            <p className="text-sm font-semibold text-yellow-900">Investment Required: 2-3% of payroll with balanced investment across stages</p>
                          </div>
                        </div>
                      </>
                    )
                  } else {
                    // OPTIMIZED
                    return (
                      <>
                        <div className="p-6 bg-white rounded-lg" style={{ border: '2px solid #10B981' }}>
                          <h3 className="font-bold text-lg mb-4 text-green-900">Sustain and Enhance Excellence</h3>

                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2">1. Evolve the Business Case</h4>
                              <p className="text-sm text-gray-700 ml-4">Focus on how leadership excellence drives innovation and agility. Document the correlation between your leadership capability and premium P/E multiples. Position leadership as your sustainable competitive advantage.</p>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">2. Advance Your Leadership Brand</h4>
                              <p className="text-sm text-gray-700 ml-4">Ensure your leadership brand evolves with strategy. Use RBL's outside-in approach: start with customer expectations and work backward to leadership capabilities. Focus on differentiators that competitors cannot easily replicate.</p>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">3. Sophisticated Assessment Approach</h4>
                              <p className="text-sm text-gray-700 ml-4">Use predictive analytics to identify future Stage 4 potential. Implement RBL's Organization Guidance System for real-time capability tracking. Conduct annual Leadership Brand Audits to ensure organizational alignment. Include external stakeholder assessments (customers, partners, investors).</p>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">4. Elite Development Experiences</h4>
                              <ul className="text-sm text-gray-700 ml-4 space-y-1">
                                <li>Enroll Stage 3-4 leaders in RBL's Reinventing the Organization Academy</li>
                                <li>Create board exposure and investor interaction opportunities</li>
                                <li>Design global leadership exchanges and external executive education</li>
                                <li>Implement reverse mentoring to keep senior leaders current</li>
                              </ul>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">5. Measure Intangible Value Creation</h4>
                              <p className="text-sm text-gray-700 ml-4">Track leadership's impact on brand value, innovation pipeline, and stakeholder confidence. Use RBL's Human Capital Investor Index to measure market value premium from leadership capability.</p>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">6. Leverage Leadership as Strategic Asset</h4>
                              <p className="text-sm text-gray-700 ml-4">Feature your leadership capability in investor presentations. Use leadership strength in M&A discussions as integration capability. Export your leadership development approach to joint ventures and partnerships.</p>
                            </div>
                          </div>

                          <div className="mt-6 p-4 bg-green-50 rounded-lg">
                            <p className="text-sm font-semibold text-green-900">Investment Required: 1-2% of payroll focused on Stage 3-4 advancement and succession planning</p>
                          </div>
                        </div>
                      </>
                    )
                  }
                })()}

                <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-700 italic">
                    The ultimate test of a firm's leadership strength comes from its ability to produce leadership capability that delivers stakeholder confidence in future results. Your Pipeline Audit is not just a diagnostic—it's the foundation for building a leadership brand that creates sustainable value for all stakeholders.
                  </p>
                </div>
              </div>
          */}

          {/* Pipeline Audit Implications and Next Steps */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">Pipeline Audit Implications and Next Steps</h2>
            <p className="text-gray-700 mb-4">
              As you review your Leadership Pipeline Audit results, remember that Stage 1 and 2 leaders do not develop or engage their people, nor do they link employees and customers to deliver the desired experience.
            </p>
            <p className="text-gray-700 mb-3">
              To address these critical gaps, implement the following approach:
            </p>
            <ul className="text-gray-700 space-y-2 mb-4" style={{ listStyle: 'disc', paddingLeft: '1.5rem' }}>
              <li>Remove Stage 1 leaders from the organization: These leaders have not developed their technical or leadership skills and have not found a way to contribute to the organization. The organization and individual are better separated. Consider how the employees reporting to these leaders could have been negatively affected, and make any necessary development adjustments for them.</li>
              <li>Segment Stage 2 leaders into three groups: Leaders that have a 1) high, 2) moderate, and 3) low chance of developing quickly into Stage 3 contributors</li>
              <li>Consider removing Stage 2 leaders with a low chance of development</li>
              <li>Actively develop the other two segments of Stage 2 leaders:
                <ul className="mt-2 space-y-1" style={{ listStyle: 'circle', paddingLeft: '2rem' }}>
                  <li>Job assignments that build Stage 3 and 4 perspectives</li>
                  <li>Mentorship from Stage 3 and 4 leaders and internal or external coaching</li>
                  <li>Leadership Code 360 Assessment or an internal leadership 360 assessment</li>
                  <li>Training programs such as the Leadership Code Academy</li>
                </ul>
              </li>
            </ul>
            <p className="text-gray-700">
              These actions will help you build a stronger leadership pipeline. By removing leaders who can't grow and investing in those who can, you'll create a team that delivers better results for both employees and customers. The key is to act quickly and focus your resources where they'll have the most impact.
            </p>
          </div>

          {/* Raw Data Table */}
          <div className="bg-white p-6 rounded-lg shadow raw-data-section">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Raw Data</h2>
              
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead style={{ backgroundColor: '#071D49' }}>
                  <tr>
                    <th className="px-4 py-2 text-left" style={{ color: 'white' }}>Leader</th>
                    <th className="px-4 py-2 text-left" style={{ color: 'white' }}>Employee</th>
                    <th className="px-4 py-2 text-left" style={{ color: 'white' }}>Title</th>
                    <th className="px-4 py-2 text-left" style={{ color: 'white' }}>Business Unit</th>
                    <th className="px-4 py-2 text-center" style={{ color: 'white' }}>Stage</th>
                    <th className="px-4 py-2 text-center" style={{ color: 'white' }}>Rank</th>
                    <th className="px-4 py-2 text-center" style={{ color: 'white' }}>Percentile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(results as any).rawData && (results as any).rawData.length > 0 ? (
                    (results as any).rawData.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-left">{row.leader}</td>
                        <td className="px-4 py-2 text-left">{row.employee}</td>
                        <td className="px-4 py-2 text-left">{row.title}</td>
                        <td className="px-4 py-2 text-left">{row.businessUnit}</td>
                        <td className="px-4 py-2 text-center">{row.stage}</td>
                        <td className="px-4 py-2 text-center">{row.rank}</td>
                        <td className="px-4 py-2 text-center">{row.percentile}%</td>
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
      )}
    </div>
  )
}