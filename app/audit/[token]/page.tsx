'use client'

import { useState, useEffect } from 'react'
import { DndContext, rectIntersection, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Employee {
  id: string
  name: string
  title: string
  businessUnit: string
  careerStage: number
  performanceRank: number
}

// Stage descriptions for the expandable section
const stageDescriptions = [
  {
    stage: 1,
    title: "Contributes Dependently",
    color: "#E8B70B", // Yellow
    description: "People who contribute dependently are seen as depending on others for support and direction. Regardless of the role they are in, this person needs others to guide them. These leaders do not have strong technical skills, so they are often not trusted to do independent projects. They need others in the organization to give them guidance about what to do. They tend to focus on routine tasks and don't completely understand the culture of how to get things done around here."
  },
  {
    stage: 2,
    title: "Contributes Independently",
    color: "#ED1B34", // Red
    description: "Those who contribute independently are seen as experts in their area of expertise. They look at work through the lens of competence and tend to be competitive with others who do similar work. They are not seen as developers of others because they tend to be micromanagers."
  },
  {
    stage: 3,
    title: "Contributes through Others",
    color: "#0086D6", // Medium RBL Blue
    description: "People contribute through others have shifted from individual expert to someone who cares about and is interdependent with others. They are strong influencers. They are still knowledgeable about their own technical area but have shifted from a focus on self to a focus on ensuring the success of their team. They get work done through others. They don't compete around a single area of expertise. They are good at seeing the value of different areas of expertise and how they fit together. These leaders are integrators, coaches, mentors and idea leaders. They understand the culture and have good networks so that they can move projects, initiatives, and new ideas through the organization successfully to get things done."
  },
  {
    stage: 4,
    title: "Contributes through Enterprise",
    color: "#071D49", // Dark RBL Navy
    description: "People who contribute through the enterprise are seen as contributors to the entire organization. They see how functions, shared services, geographies and operating units fit together and serve the enterprise. They also have control over the resources of the company and can harness those resources of people, money, and information. They have shifted from influence to power—meaning that they are accountable for the success or failure of the entire business. They set strategic direction for a large part if not the entire business. From the outside, these leaders are seen as representing the entire business. Their orientation to people is no longer to mentor or coach them but to test them for future senior roles."
  }
]

// Sortable Employee Card Component
function SortableEmployeeCard({ 
  employee, 
  index,
  isTopPerformer,
  isBottomPerformer 
}: { 
  employee: Employee, 
  index: number,
  isTopPerformer: boolean,
  isBottomPerformer: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: employee.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none',
  }

  // Determine background color
  let backgroundColor = 'white'
  let borderColor = isDragging ? '#0086D6' : '#e5e7eb'
  
  if (isTopPerformer) {
    backgroundColor = '#E8FFF9' // Light RBL green tint
    borderColor = isDragging ? '#0086D6' : '#5EC4B6'
  } else if (isBottomPerformer) {
    backgroundColor = '#FEF2F2' // Light red tint
    borderColor = isDragging ? '#0086D6' : '#FCA5A5'
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor,
        borderColor
      }}
      {...attributes}
      {...listeners}
      className={`p-4 border-2 rounded-lg cursor-move transition-all hover:shadow-lg`}
    >
      <div className="text-center">
        {/* Performance Label Inside Card */}
        {(isTopPerformer || isBottomPerformer) && (
          <div className={`text-xs font-bold mb-2 ${
            isTopPerformer ? 'text-green-600' : 'text-red-600'
          }`}>
            {isTopPerformer ? 'HIGHEST PERFORMER' : 'LEAST HIGHEST PERFORMER'}
          </div>
        )}
        
        {/* Rank Number */}
        <div className={`text-3xl font-bold mb-2 ${
          isTopPerformer ? 'text-green-600' : 
          isBottomPerformer ? 'text-red-600' : 
          'text-blue-600'
        }`}>
          #{index + 1}
        </div>
        
        {/* Employee Name */}
        <div className="font-semibold text-base mb-1">
          {employee.name}
        </div>
        
        {/* Title */}
        <div className="text-xs text-gray-600 mb-1">
          {employee.title}
        </div>
        
        {/* Business Unit */}
        <div className="text-xs text-gray-500">
          {employee.businessUnit}
        </div>
      </div>
    </div>
  )
}

export default function AuditPage({ params }: { params: { token: string } }) {
  const [step, setStep] = useState<'loading' | 'intro' | 'stages' | 'ranking' | 'summary' | 'complete'>('loading')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [leaderName, setLeaderName] = useState('')
  const [auditName, setAuditName] = useState('')
  const [message, setMessage] = useState('')
  const [showDescriptions, setShowDescriptions] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadAuditData()
  }, [])

  useEffect(() => {
    // Scroll to top when entering the intro, stages, ranking, or summary step
    if (step === 'intro' || step === 'stages' || step === 'ranking' || step === 'summary') {
      window.scrollTo(0, 0)
    }
  }, [step])

  const loadAuditData = async () => {
    try {
      const response = await fetch(`/api/audit/leader/${params.token}`)
      if (response.ok) {
        const data = await response.json()
        if (data.completed) {
          setStep('complete')
          setMessage('You have already completed this audit. Thank you!')
        } else {
          setEmployees(data.employees)
          setLeaderName(data.leaderName)
          setAuditName(data.auditName || 'Leadership Pipeline Audit')
          setStep('intro') // Start with intro page
        }
      } else {
        setMessage('Invalid audit link')
      }
    } catch (error) {
      setMessage('Error loading audit')
    }
  }

  const handleStageChange = (employeeId: string, stage: number) => {
    setEmployees(employees.map(emp => 
      emp.id === employeeId ? { ...emp, careerStage: stage } : emp
    ))
  }

  const proceedToRanking = () => {
    // Check if all stages are selected
    if (employees.some(emp => emp.careerStage === 0)) {
      setMessage('Please select a career stage for all employees')
      return
    }
    setMessage('')
    setStep('ranking')
  }

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id)
  }

  const handleDragOver = (event: any) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      setEmployees((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setEmployees((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
    
    setActiveId(null)
  }

  const proceedToSummary = () => {
    // Update performance ranks based on current order
    const rankedEmployees = employees.map((emp, index) => ({
      ...emp,
      performanceRank: index + 1
    }))
    setEmployees(rankedEmployees)
    setStep('summary')
  }

  const submitRatings = async () => {
    try {
      const response = await fetch(`/api/audit/leader/${params.token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees })
      })

      if (response.ok) {
        setStep('complete')
        setMessage('Your results are now being synthesized into a comprehensive report. Once complete, we will schedule a debrief session to review your results, explore the key insights, and discuss recommended next steps. \n\nThank you for your participation.')
      } else {
        setMessage('Error submitting ratings')
      }
    } catch (error) {
      setMessage('Error: ' + error)
    }
  }

  if (step === 'loading') {
    return <div className="p-8 text-center">Loading audit data...</div>
  }

  if (step === 'complete') {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <h1 className="text-3xl font-bold mb-4 text-green-600">✓ Audit Complete</h1>
        <p className="text-lg">{message}</p>
      </div>
    )
  }


  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* RBL Brand Header */}
      <div style={{
        background: 'linear-gradient(135deg, #071D49 0%, #0086D6 100%)',
        color: 'white',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        marginBottom: '2rem'
      }}>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'white' }}>
          {step === 'intro' ? 'The Leadership Pipeline Journey' : 'Pipeline Audit'}
        </h1>
        <p style={{ opacity: 0.95, color: 'white' }}>Welcome, {leaderName}</p>
      </div>

      {/* Introduction Page */}
      {step === 'intro' && (
        <div>
          {/* Introduction Text */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Introduction to the Leadership Pipeline Audit Process</h2>
            <p className="text-gray-700 mb-4 leading-relaxed">
              Thank you for participating in this important leadership assessment. The Leadership Pipeline Audit helps organizations understand their leadership bench strength and identify opportunities for development and advancement.
            </p>
            <p className="text-gray-700 leading-relaxed">
              This audit consists of two key exercises that will take approximately 15-20 minutes to complete. In the first exercise on the next page, you will categorize each employee based on how they contribute to the organization. On the second exercise, you will rank employees by their relative performance and impact.
            </p>
          </div>
          
          {/* Pipeline Journey Image */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">The Leadership Pipeline Journey</h2>
            <img
              src="/pipeline-journey.png"
              alt="Leadership Pipeline Journey"
              className="w-full rounded-lg shadow-lg"
            />
          </div>

          {/* Journey Content Box */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <p className="text-gray-700 mb-6 leading-relaxed">
              The Leadership Pipeline Journey establishes the purpose and value of the leadership pipeline audit, aligning leaders on how expectations for contribution change across leadership roles and why gaps create organizational risk.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-lg text-gray-800 mb-2">1. Perform the Leadership Pipeline Audit</h3>
                <p className="text-gray-700 leading-relaxed">
                  Leaders are assessed using four distinct contribution types and a force-ranking process to evaluate how individuals contribute, independent of role, age, or tenure.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-lg text-gray-800 mb-2">2. Review Results</h3>
                <p className="text-gray-700 leading-relaxed">
                  Results are synthesized into a clear report and reviewed with senior sponsors to build shared understanding of how the current pipeline compares to future needs.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-lg text-gray-800 mb-2">3. Define The Challenge</h3>
                <p className="text-gray-700 leading-relaxed">
                  Identify critical leadership contribution gaps and define targeted priorities based on what is needed versus what exists.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-lg text-gray-800 mb-2">4. Improvement Options</h3>
                <div className="ml-6 space-y-3">
                  <div>
                    <p className="text-gray-700 leading-relaxed">
                      <span className="font-semibold">A. Leadership Infrastructure:</span> Leadership expectations are clarified and embedded into competency models, development programs, performance management, and succession processes to reinforce the pipeline logic at scale.
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-700 leading-relaxed">
                      <span className="font-semibold">B. Targeted Development:</span> Development is tailored by contribution type, linking audit results to academies, coaching, and senior leader involvement to accelerate progression where it matters most.
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-700 leading-relaxed">
                      <span className="font-semibold">C. Job Assignment:</span> Assess high potential leaders and tailor their career paths, help leaders stuck in one stage of contribution broaden their contribution to other levels.
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-700 leading-relaxed">
                      <span className="font-semibold">D. Individual Development:</span> Traditional coaching and individual training programs.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Proceed Button */}
          <button
            onClick={() => setStep('stages')}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            style={{ background: '#0086D6' }}
          >
            Proceed to Leadership Pipeline Audit →
          </button>
        </div>
      )}

      {/* Stage Selection */}
      {step === 'stages' && (
        <div>

          {/* Video Player */}
          <div className="mb-8">
            <video
              className="w-full rounded-lg border-2 border-gray-200"
              controls
              preload="metadata"
              playsInline
              poster="/contribution-poster.jpg"
            >
              <source src="/contribution.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          <h2 className="text-2xl font-semibold mb-4">
            Step 1: Categorize Each Leader's Way of Contributing
          </h2>
          <p className="mb-6 text-gray-600">
            For each person, sort into one of the four options.
          </p>

          {/* Stage Framework Tables - Desktop shows as one 4-column table, Mobile shows as two 2-column tables */}
          <div className="stage-framework-container mb-6">
            {/* Desktop: Single 4-column table */}
            <div className="desktop-table bg-white rounded-lg shadow overflow-hidden">
              <div className="grid grid-cols-4" style={{ minHeight: '300px' }}>
                {/* Stage 1 Column */}
                <div className="border-r border-gray-200">
                  <div 
                    className="text-white text-center py-3 font-bold text-lg"
                    style={{ backgroundColor: '#E8B70B' }}
                  >
                    Dependently
                  </div>
                  <div className="px-6 py-4">
                    <ul className="space-y-3">
                      <li className="text-sm text-gray-700">Depends on others</li>
                      <li className="text-sm text-gray-700">Works on a portion of a larger project</li>
                      <li className="text-sm text-gray-700">Works on routine tasks</li>
                      <li className="text-sm text-gray-700">Learns how "we" do things</li>
                    </ul>
                  </div>
                </div>

                {/* Stage 2 Column */}
                <div className="border-r border-gray-200">
                  <div 
                    className="text-white text-center py-3 font-bold text-lg"
                    style={{ backgroundColor: '#ED1B34' }}
                  >
                    Independently
                  </div>
                  <div className="px-6 py-4">
                    <ul className="space-y-3">
                      <li className="text-sm text-gray-700">Works independently</li>
                      <li className="text-sm text-gray-700">Responsible for projects</li>
                      <li className="text-sm text-gray-700">Credible</li>
                      <li className="text-sm text-gray-700">Considered an expert</li>
                      <li className="text-sm text-gray-700">Has an internal network of other experts</li>
                      <li className="text-sm text-gray-700">Can often act as an innovator in technical area of expertise</li>
                    </ul>
                  </div>
                </div>

                {/* Stage 3 Column */}
                <div className="border-r border-gray-200">
                  <div 
                    className="text-white text-center py-3 font-bold text-lg"
                    style={{ backgroundColor: '#0086D6' }}
                  >
                    Through Others
                  </div>
                  <div className="px-6 py-4">
                    <ul className="space-y-3">
                      <li className="text-sm text-gray-700">Influences others</li>
                      <li className="text-sm text-gray-700">Ability to integrate across multiple areas of expertise in complex projects</li>
                      <li className="text-sm text-gray-700">Manages, coaches, mentors and/or idea leader</li>
                      <li className="text-sm text-gray-700">Develops others</li>
                      <li className="text-sm text-gray-700">Represents workgroup to external stakeholders</li>
                      <li className="text-sm text-gray-700">Builds internal and external networks</li>
                    </ul>
                  </div>
                </div>

                {/* Stage 4 Column */}
                <div>
                  <div 
                    className="text-white text-center py-3 font-bold text-lg"
                    style={{ backgroundColor: '#071D49' }}
                  >
                    Through Enterprise
                  </div>
                  <div className="px-6 py-4">
                    <ul className="space-y-3">
                      <li className="text-sm text-gray-700">Directs the business</li>
                      <li className="text-sm text-gray-700">Sets strategic direction</li>
                      <li className="text-sm text-gray-700">Controls business resources</li>
                      <li className="text-sm text-gray-700">Uses power rather than influence</li>
                      <li className="text-sm text-gray-700">Sponsors key people</li>
                      <li className="text-sm text-gray-700">Represents the entire organization to outside groups</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile: Two 2-column tables */}
            <div className="mobile-tables">
              {/* First Table: Stages 1 & 2 */}
              <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
                <div className="grid grid-cols-2">
                  {/* Stage 1 Column */}
                  <div className="border-r border-gray-200">
                    <div 
                      className="text-white text-center py-3 font-bold text-lg"
                      style={{ backgroundColor: '#E8B70B' }}
                    >
                      Contributes Dependently
                    </div>
                    <div className="px-4 py-4">
                      <ul className="space-y-2">
                        <li className="text-xs text-gray-700">Depends on others</li>
                        <li className="text-xs text-gray-700">Works on a portion of a larger project</li>
                        <li className="text-xs text-gray-700">Works on routine tasks</li>
                        <li className="text-xs text-gray-700">Learns how "we" do things</li>
                      </ul>
                    </div>
                  </div>

                  {/* Stage 2 Column */}
                  <div>
                    <div 
                      className="text-white text-center py-3 font-bold text-lg"
                      style={{ backgroundColor: '#ED1B34' }}
                    >
                      Contributes Independently
                    </div>
                    <div className="px-4 py-4">
                      <ul className="space-y-2">
                        <li className="text-xs text-gray-700">Works independently</li>
                        <li className="text-xs text-gray-700">Responsible for projects</li>
                        <li className="text-xs text-gray-700">Credible</li>
                        <li className="text-xs text-gray-700">Considered an expert</li>
                        <li className="text-xs text-gray-700">Has an internal network of other experts</li>
                        <li className="text-xs text-gray-700">Can often act as an innovator in technical area of expertise</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Second Table: Stages 3 & 4 */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="grid grid-cols-2">
                  {/* Stage 3 Column */}
                  <div className="border-r border-gray-200">
                    <div 
                      className="text-white text-center py-3 font-bold text-lg"
                      style={{ backgroundColor: '#0086D6' }}
                    >
                      Contributes through Others
                    </div>
                    <div className="px-4 py-4">
                      <ul className="space-y-2">
                        <li className="text-xs text-gray-700">Influences others</li>
                        <li className="text-xs text-gray-700">Ability to integrate across multiple areas of expertise in complex projects</li>
                        <li className="text-xs text-gray-700">Manages, coaches, mentors and/or idea leader</li>
                        <li className="text-xs text-gray-700">Develops others</li>
                        <li className="text-xs text-gray-700">Represents workgroup to external stakeholders</li>
                        <li className="text-xs text-gray-700">Builds internal and external networks</li>
                      </ul>
                    </div>
                  </div>

                  {/* Stage 4 Column */}
                  <div>
                    <div 
                      className="text-white text-center py-3 font-bold text-lg"
                      style={{ backgroundColor: '#071D49' }}
                    >
                      Contributes through Enterprise
                    </div>
                    <div className="px-4 py-4">
                      <ul className="space-y-2">
                        <li className="text-xs text-gray-700">Directs the business</li>
                        <li className="text-xs text-gray-700">Sets strategic direction</li>
                        <li className="text-xs text-gray-700">Controls business resources</li>
                        <li className="text-xs text-gray-700">Uses power rather than influence</li>
                        <li className="text-xs text-gray-700">Sponsors key people</li>
                        <li className="text-xs text-gray-700">Represents the entire organization to outside groups</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Toggle for Stage Descriptions */}
          <button
            onClick={() => setShowDescriptions(!showDescriptions)}
            className="mb-6 px-4 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 font-medium"
            style={{ background: 'rgba(0, 134, 214, 0.1)' }}
          >
            {showDescriptions ? '− Hide' : '+ Show'} Detailed Descriptions
          </button>

          {/* Stage Descriptions */}
          {showDescriptions && (
            <div className="mb-6 space-y-4">
              {stageDescriptions.map((stage) => (
                <div key={stage.stage} className="bg-white p-4 rounded-lg shadow border-l-4" 
                     style={{ borderLeftColor: stage.color }}>
                  <h3 className="font-bold text-lg mb-2" style={{ color: stage.color }}>
                    {stage.title}
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {stage.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Employee Cards */}
          <div className="space-y-4 mb-8">
            {employees.map(emp => (
              <div key={emp.id} className="p-4 bg-white border rounded-lg shadow">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="font-semibold">{emp.name}</div>
                    <div className="text-sm text-gray-600">{emp.title} - {emp.businessUnit}</div>
                  </div>
                  <select
                    value={emp.careerStage}
                    onChange={(e) => handleStageChange(emp.id, parseInt(e.target.value))}
                    className="ml-4 p-2 border rounded text-lg font-semibold"
                    style={{ minWidth: '150px' }}
                  >
                    <option value="0">Selection</option>
                    <option value="1">Contributes Dependently</option>
                    <option value="2">Contributes Independently</option>
                    <option value="3">Contributes through Others</option>
                    <option value="4">Contributes through Enterprise</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={proceedToRanking}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            style={{ background: '#0086D6' }}
          >
            Proceed to Performance Ranking →
          </button>
        </div>
      )}

      {/* Performance Ranking */}
      {step === 'ranking' && (
        <div>
          {/* Video Player */}
          <div className="mb-8">
            <video
              className="w-full rounded-lg border-2 border-gray-200"
              controls
              preload="metadata"
              playsInline
              poster="/performance-poster.jpg"
            >
              <source src="/performance.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          <h2 className="text-2xl font-semibold mb-4">
            Step 2: Relative Performance Ranking
          </h2>
          <p className="mb-6 text-gray-600">
            In this next exercise, your task is to rank each of the people in order. Who is your highest performer to who has the least impact.  The person who is in last place may still be a very good performer but relative to others you are ranking is not as strong. For purposes of this exercise, there will be no need to tell others in what order you ranked them. We are using this information for statistical purposes and to correlate with where you sorted them earlier. </p>
<p className="mb-6 text-gray-600">The definition of performance is your opinion as a leader on what is the relative impact of these leaders. Imagine you were starting this group again with a very limited budget. In what order would you hire first to last?</p>
            <p className="mb-6 text-gray-600"> A tip for how to do this is to start with your top 2–3 and then your bottom 2–3. Sort the middle out after you have this figured out. </p>
            <p className="mb-6 text-gray-600">Now rank them.
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={employees.map(e => e.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-4 gap-4 mb-8">
                {employees.map((emp, index) => {
                  const isTopPerformer = index === 0
                  const isBottomPerformer = index === employees.length - 1
                  
                  return (
                    <SortableEmployeeCard 
                      key={emp.id}
                      employee={emp} 
                      index={index}
                      isTopPerformer={isTopPerformer}
                      isBottomPerformer={isBottomPerformer}
                    />
                  )
                })}
              </div>
            </SortableContext>
          </DndContext>

          <button
            onClick={proceedToSummary}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            style={{ background: '#0086D6' }}
          >
            Review and Submit →
          </button>
        </div>
      )}

      {/* Summary Page */}
      {step === 'summary' && (
        <div>
          <h2 className="text-3xl font-bold mb-6 text-gray-800">Review Your Assessment</h2>
          <p className="text-gray-600 mb-8">
            Please review your selections below. You can go back to make changes if needed.
          </p>

          {/* Contribution Assignments Summary */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Contribution Category Assignments</h3>
              <button
                onClick={() => setStep('stages')}
                className="px-4 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
              >
                Edit Contribution Category
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {employees.map(emp => {
                const stageName = emp.careerStage === 1 ? 'Contributes Dependently' :
                                  emp.careerStage === 2 ? 'Contributes Independently' :
                                  emp.careerStage === 3 ? 'Contributes through Others' :
                                  emp.careerStage === 4 ? 'Contributes through Enterprise' : 'Not Selected'
                const stageColor = emp.careerStage === 1 ? '#E8B70B' :
                                   emp.careerStage === 2 ? '#ED1B34' :
                                   emp.careerStage === 3 ? '#0086D6' :
                                   emp.careerStage === 4 ? '#071D49' : '#999'

                return (
                  <div key={emp.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="font-semibold text-gray-800">{emp.name}</div>
                    <div className="text-sm text-gray-600 mb-2">{emp.title}</div>
                    <div className="flex items-center">
                      <span
                        className="inline-block w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: stageColor }}
                      ></span>
                      <span className="text-sm font-medium" style={{ color: stageColor }}>
                        {stageName}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Performance Ranking Summary */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Performance Rankings</h3>
              <button
                onClick={() => setStep('ranking')}
                className="px-4 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
              >
                Edit Rankings
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {employees.map((emp, index) => {
                const isTopPerformer = index === 0
                const isBottomPerformer = index === employees.length - 1

                let bgColor = 'bg-white'
                let borderColor = 'border-gray-200'
                let rankColor = 'text-blue-600'

                if (isTopPerformer) {
                  bgColor = 'bg-green-50'
                  borderColor = 'border-green-400'
                  rankColor = 'text-green-600'
                } else if (isBottomPerformer) {
                  bgColor = 'bg-red-50'
                  borderColor = 'border-red-300'
                  rankColor = 'text-red-600'
                }

                return (
                  <div
                    key={emp.id}
                    className={`${bgColor} border-2 ${borderColor} rounded-lg p-4 text-center`}
                  >
                    <div className={`text-2xl font-bold ${rankColor} mb-1`}>
                      #{index + 1}
                    </div>
                    {(isTopPerformer || isBottomPerformer) && (
                      <div className={`text-xs font-bold mb-2 ${
                        isTopPerformer ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isTopPerformer ? 'HIGHEST' : 'LOWEST'}
                      </div>
                    )}
                    <div className="font-semibold text-sm mb-1">{emp.name}</div>
                    <div className="text-xs text-gray-600">{emp.title}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Submit Section */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
            <h3 className="font-bold text-lg mb-3 text-amber-900">Ready to Submit?</h3>
            <p className="text-gray-700 mb-4">
              Once you submit, you will not be able to make further changes. Please ensure all your selections are accurate.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setStep('stages')}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
              >
                ← Back to Contribution Category
              </button>
              <button
                onClick={submitRatings}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors"
                style={{ background: '#5EC4B6' }}
              >
                Submit Final Assessment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {message && (
        <div className={`mt-4 p-3 rounded ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {message}
        </div>
      )}

      <style jsx>{`
        /* Default: show desktop table, hide mobile tables */
        .desktop-table {
          display: block;
        }
        
        .mobile-tables {
          display: none;
        }

        /* Mobile breakpoint - switch to two tables */
        @media (max-width: 768px) {
          .desktop-table {
            display: none;
          }
          
          .mobile-tables {
            display: block;
          }
        }
      `}</style>
    </div>
  )
}