import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { fetchStudents } from '../services/studentService'
import { sendCustomWhatsAppMessage } from '../services/notificationService'
import {
  fetchClassGroups,
  createClassWhatsAppGroup,
  syncClassWhatsAppGroup,
  sendClassGroupAnnouncement,
  sendClassBroadcastBatch
} from '../services/groupService'
import { Student, ClassName, ClassGroup } from '../types/database.types'
import {
  getTamilAbsenceMessage,
  getTamilFeesReminderMessage,
  getTamilMarksReportMessage,
  getTamilGeneralNoticeMessage,
  getTamilClassExamScheduleMessage,
  getTamilClassHolidayMessage,
  getTamilClassSpecialClassMessage,
  getTamilClassMeetingMessage,
  createWhatsAppChatUrl
} from '../utils/tamilMessages'
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  Users,
  User,
  Sparkles,
  ExternalLink,
  PlusCircle,
  RefreshCw,
  MessageSquare,
  AlertCircle,
  Radio,
  Share2
} from 'lucide-react'

type BroadcastMode = 'group' | 'individual'

export const CustomMessage: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const state = location.state as {
    studentId?: string
    studentName?: string
    parentPhone?: string
    presetType?: 'absence' | 'fees' | 'marks'
    overrideMessage?: string
    className?: ClassName
  } | null

  const [mode, setMode] = useState<BroadcastMode>(state?.studentId ? 'individual' : 'group')
  const [students, setStudents] = useState<Student[]>([])
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([])
  
  // Group Mode State
  const [selectedClass, setSelectedClass] = useState<ClassName>(state?.className || '12th')
  const [groupActionLoading, setGroupActionLoading] = useState(false)

  // Individual Mode State
  const [selectedStudentId, setSelectedStudentId] = useState<string>(state?.studentId || '')
  
  // Common State
  const [messageText, setMessageText] = useState(state?.overrideMessage || '')
  const [sending, setSending] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{ sent: number; total: number } | null>(null)
  const [result, setResult] = useState<{ success: boolean; message?: string } | null>(null)

  useEffect(() => {
    Promise.all([fetchStudents(), fetchClassGroups()]).then(([studentsData, groupsData]) => {
      setStudents(studentsData)
      setClassGroups(groupsData)

      if (state?.studentId) {
        setSelectedStudentId(state.studentId)
        const s = studentsData.find(item => item.id === state.studentId)
        if (s && !messageText) {
          if (state.overrideMessage) {
            setMessageText(state.overrideMessage)
          } else if (state.presetType === 'fees') {
            setMessageText(getTamilFeesReminderMessage({ studentName: s.name, className: s.class_name }))
          } else {
            setMessageText(getTamilAbsenceMessage({ studentName: s.name, className: s.class_name }))
          }
        }
      } else if (!messageText) {
        // Default group template
        setMessageText(getTamilClassExamScheduleMessage('12th'))
      }
    })
  }, [])

  const selectedStudent = students.find(s => s.id === selectedStudentId)
  const currentClassGroup = classGroups.find(g => g.class_name === selectedClass)
  const classStudents = students.filter(s => s.class_name === selectedClass && s.active)

  // Quick Tamil Templates for Class Group
  const applyGroupTemplate = (type: 'exam' | 'holiday' | 'special' | 'ptm' | 'general') => {
    if (type === 'exam') {
      setMessageText(getTamilClassExamScheduleMessage(`${selectedClass} Standard`))
    } else if (type === 'holiday') {
      setMessageText(getTamilClassHolidayMessage(`${selectedClass} Standard`))
    } else if (type === 'special') {
      setMessageText(getTamilClassSpecialClassMessage(`${selectedClass} Standard`))
    } else if (type === 'ptm') {
      setMessageText(getTamilClassMeetingMessage(`${selectedClass} Standard`))
    } else if (type === 'general') {
      setMessageText(getTamilGeneralNoticeMessage({ noticeTitle: `${selectedClass} வகுப்பு பொது சுற்றறிக்கை` }))
    }
  }

  // Quick Tamil Templates for Individual Student
  const applyStudentTemplate = (type: 'absence' | 'fees' | 'marks' | 'holiday') => {
    if (!selectedStudent) return
    const params = {
      studentName: selectedStudent.name,
      className: selectedStudent.class_name
    }

    if (type === 'absence') {
      setMessageText(getTamilAbsenceMessage(params))
    } else if (type === 'fees') {
      setMessageText(getTamilFeesReminderMessage(params))
    } else if (type === 'marks') {
      setMessageText(getTamilMarksReportMessage(params))
    } else if (type === 'holiday') {
      setMessageText(getTamilGeneralNoticeMessage(params))
    }
  }

  // Handle Class WhatsApp Group Creation
  const handleCreateGroup = async () => {
    if (classStudents.length === 0) {
      setResult({ success: false, message: `No active students found in ${selectedClass} Standard to create group.` })
      return
    }

    setGroupActionLoading(true)
    setResult(null)

    const res = await createClassWhatsAppGroup(selectedClass, students)
    setGroupActionLoading(false)

    if (res.success && res.group) {
      setClassGroups(prev => [...prev.filter(g => g.class_name !== selectedClass), res.group!])
      setResult({
        success: true,
        message: `✅ Created WhatsApp Group "${res.group.group_name}" with ${res.group.participant_count} parent contacts!`
      })
    } else {
      setResult({
        success: false,
        message: res.error || 'Failed to create WhatsApp group. Ensure WhatsApp Gateway is connected in Settings.'
      })
    }
  }

  // Handle Syncing Group Members
  const handleSyncGroup = async () => {
    if (!currentClassGroup) return
    setGroupActionLoading(true)
    setResult(null)

    const res = await syncClassWhatsAppGroup(currentClassGroup, students)
    setGroupActionLoading(false)

    if (res.success) {
      setResult({
        success: true,
        message: `✅ Synchronized latest active parents to ${selectedClass} Standard WhatsApp Group!`
      })
      const refreshed = await fetchClassGroups()
      setClassGroups(refreshed)
    } else {
      setResult({ success: false, message: res.error || 'Failed to sync group participants.' })
    }
  }

  // Dispatch Announcement to WhatsApp Group
  const handleSendGroupAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim()) return

    if (!currentClassGroup?.group_jid) {
      setResult({
        success: false,
        message: `WhatsApp Group for ${selectedClass} is not created yet. Click "Create WhatsApp Group" below first.`
      })
      return
    }

    setSending(true)
    setResult(null)

    const res = await sendClassGroupAnnouncement(currentClassGroup.group_jid, messageText)
    setSending(false)

    if (res.success) {
      setResult({
        success: true,
        message: `🚀 Announcement successfully posted to "${currentClassGroup.group_name}" WhatsApp Group!`
      })
    } else {
      setResult({
        success: false,
        message: res.error || 'Failed to send message to group. Check WhatsApp gateway status.'
      })
    }
  }

  // 1-Click Broadcast to All Parents in Class
  const handleSendClassBroadcast = async () => {
    if (classStudents.length === 0 || !messageText.trim()) return
    if (!window.confirm(`Send this announcement individually to all ${classStudents.length} parents in ${selectedClass} Standard?`)) {
      return
    }

    setSending(true)
    setResult(null)
    setBatchProgress({ sent: 0, total: classStudents.length })

    const resultStats = await sendClassBroadcastBatch(classStudents, messageText, (sent, total) => {
      setBatchProgress({ sent, total })
    })

    setSending(false)
    setBatchProgress(null)
    setResult({
      success: true,
      message: `✅ Broadcast completed: Delivered to ${resultStats.sentCount} parents (${resultStats.failedCount} failed).`
    })
  }

  // Individual Direct WhatsApp
  const handleDirectWhatsApp = () => {
    if (!selectedStudent || !messageText.trim()) return
    const phone = selectedStudent.whatsapp_phone || selectedStudent.parent_phone
    const url = createWhatsAppChatUrl(phone, messageText)
    window.open(url, '_blank')
  }

  // Individual Cloud Send
  const handleIndividualCloudSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent || !messageText.trim()) return

    setSending(true)
    setResult(null)

    const parentPhone = selectedStudent.whatsapp_phone || selectedStudent.parent_phone
    const res = await sendCustomWhatsAppMessage(selectedStudent.id, parentPhone, messageText)

    setSending(false)
    if (res.success) {
      setResult({
        success: true,
        message: `WhatsApp message dispatched successfully to ${selectedStudent.name}'s contact (${parentPhone})`
      })
    } else {
      setResult({ success: false, message: res.error || 'Failed to dispatch message' })
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 max-w-md mx-auto relative">
      <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="font-extrabold text-base text-white tracking-tight">
              Class Announcements & WhatsApp
            </h1>
            <p className="text-[10px] text-emerald-400 font-semibold">1-Click Group & Student Dispatch</p>
          </div>
          <div className="w-9 h-9"></div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Mode Selector Tab */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-900 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode('group')
              setResult(null)
              if (!messageText) {
                setMessageText(getTamilClassExamScheduleMessage(`${selectedClass} Standard`))
              }
            }}
            className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all ${
              mode === 'group'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Class Group Broadcast</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('individual')
              setResult(null)
              if (selectedStudent) {
                setMessageText(getTamilAbsenceMessage({ studentName: selectedStudent.name, className: selectedStudent.class_name }))
              }
            }}
            className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all ${
              mode === 'individual'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Individual Student</span>
          </button>
        </div>

        {result && (
          <div className={`p-4 rounded-2xl border text-xs flex items-start space-x-2.5 ${
            result.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            {result.success ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />}
            <span>{result.message}</span>
          </div>
        )}

        {/* ----------------- MODE A: CLASS GROUP BROADCAST ----------------- */}
        {mode === 'group' ? (
          <div className="space-y-4">
            {/* Class Tabs */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">Target Academic Class (வகுப்பு)</label>
              <div className="grid grid-cols-3 gap-2">
                {(['10th', '11th', '12th'] as ClassName[]).map(c => {
                  const count = students.filter(s => s.class_name === c && s.active).length
                  const hasGroup = classGroups.some(g => g.class_name === c)
                  return (
                    <button
                      type="button"
                      key={c}
                      onClick={() => {
                        setSelectedClass(c)
                        setMessageText(getTamilClassExamScheduleMessage(`${c} Standard`))
                      }}
                      className={`p-2.5 rounded-2xl font-bold text-xs border transition-all text-left flex flex-col justify-between ${
                        selectedClass === c
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm">{c} Std</span>
                        <span className={`w-2 h-2 rounded-full ${hasGroup ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      </div>
                      <span className="text-[10px] font-normal opacity-80 pt-1">{count} Parents</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Class Group Status Card */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-white">
                    {currentClassGroup ? currentClassGroup.group_name : `SP Academy - ${selectedClass} Standard Group`}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {currentClassGroup
                      ? `🟢 Connected Group (${classStudents.length} Students Mapped)`
                      : `⚠️ Group not created on WhatsApp yet`}
                  </p>
                </div>

                {currentClassGroup?.invite_url && (
                  <a
                    href={currentClassGroup.invite_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-slate-800 text-emerald-400 hover:text-white border border-slate-700 text-xs font-bold flex items-center space-x-1"
                    title="Open Group in WhatsApp"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Link</span>
                  </a>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-1">
                {!currentClassGroup ? (
                  <button
                    type="button"
                    disabled={groupActionLoading}
                    onClick={handleCreateGroup}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/30 active:scale-95 disabled:opacity-50"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{groupActionLoading ? 'Creating Group...' : `⚡ Create ${selectedClass} WhatsApp Group`}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={groupActionLoading}
                    onClick={handleSyncGroup}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${groupActionLoading ? 'animate-spin' : ''}`} />
                    <span>Sync {classStudents.length} Active Parents</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Tamil Templates for Class */}
            <div className="space-y-2">
              <div className="flex items-center space-x-1 text-xs font-semibold text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Class Announcement Templates (தமிழ் அறிவிப்புகள்):</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => applyGroupTemplate('exam')}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-blue-500/30 text-blue-300 text-[11px] font-semibold text-left transition-all active:scale-95"
                >
                  📝 தேர்வு அட்டவணை (Exam)
                </button>
                <button
                  type="button"
                  onClick={() => applyGroupTemplate('holiday')}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold text-left transition-all active:scale-95"
                >
                  🌴 விடுமுறை அறிவிப்பு (Holiday)
                </button>
                <button
                  type="button"
                  onClick={() => applyGroupTemplate('special')}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-amber-300 text-[11px] font-semibold text-left transition-all active:scale-95"
                >
                  ⏰ சிறப்பு வகுப்பு (Revision)
                </button>
                <button
                  type="button"
                  onClick={() => applyGroupTemplate('ptm')}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-purple-500/30 text-purple-300 text-[11px] font-semibold text-left transition-all active:scale-95"
                >
                  🤝 பெற்றோர் கூட்டம் (PTM)
                </button>
              </div>
            </div>

            {/* Announcement Message Box */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Announcement Message (குழுவிற்கு அனுப்பும் செய்தி)
              </label>
              <textarea
                required
                rows={8}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type circular or announcement in Tamil or English..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-sans leading-relaxed"
              />
            </div>

            {/* Action Buttons for Group Broadcast */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                disabled={sending || !currentClassGroup}
                onClick={handleSendGroupAnnouncement}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-blue-600/30 flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>
                  {sending
                    ? 'Posting to Group...'
                    : `Post to ${selectedClass} WhatsApp Group (குழுவிற்கு அனுப்பு)`}
                </span>
              </button>

              <button
                type="button"
                disabled={sending || classStudents.length === 0}
                onClick={handleSendClassBroadcast}
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold py-3 rounded-2xl text-xs flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {batchProgress
                    ? `Broadcasting (${batchProgress.sent}/${batchProgress.total})...`
                    : `1-Click Broadcast to All ${classStudents.length} Parents Individually`}
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* ----------------- MODE B: INDIVIDUAL STUDENT MESSAGE ----------------- */
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">Select Student</label>
              <select
                value={selectedStudentId}
                onChange={(e) => {
                  const newId = e.target.value
                  setSelectedStudentId(newId)
                  const s = students.find(item => item.id === newId)
                  if (s) {
                    setMessageText(getTamilAbsenceMessage({ studentName: s.name, className: s.class_name }))
                  }
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.class_name}) • {s.parent_phone}
                  </option>
                ))}
              </select>
            </div>

            {selectedStudent && (
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>{selectedStudent.name}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {selectedStudent.class_name} Standard
                  </span>
                </div>
                <p className="text-slate-400 text-[11px]">Primary Contact: <span className="text-slate-200 font-mono">{selectedStudent.parent_phone}</span></p>
                <p className="text-slate-400 text-[11px]">WhatsApp: <span className="text-emerald-400 font-mono font-medium">{selectedStudent.whatsapp_phone || selectedStudent.parent_phone}</span></p>
              </div>
            )}

            {/* Quick Tamil Templates for Individual Student */}
            <div className="space-y-2">
              <div className="flex items-center space-x-1 text-xs font-semibold text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Tamil Templates (தமிழ் டெம்ப்ளேட்கள்):</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => applyStudentTemplate('absence')}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-rose-500/30 text-rose-300 text-[11px] font-semibold text-left transition-all active:scale-95"
                >
                  🚨 வருகையின்மை (Absent)
                </button>
                <button
                  type="button"
                  onClick={() => applyStudentTemplate('fees')}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-amber-300 text-[11px] font-semibold text-left transition-all active:scale-95"
                >
                  💰 கட்டண நிலுவை (Fee)
                </button>
                <button
                  type="button"
                  onClick={() => applyStudentTemplate('marks')}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-blue-500/30 text-blue-300 text-[11px] font-semibold text-left transition-all active:scale-95"
                >
                  📊 தேர்வு மதிப்பெண் (Marks)
                </button>
                <button
                  type="button"
                  onClick={() => applyStudentTemplate('holiday')}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold text-left transition-all active:scale-95"
                >
                  📢 விடுமுறை அறிவிப்பு (Notice)
                </button>
              </div>
            </div>

            {/* Individual Message Content */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">Message Content (செய்தி விவரம்)</label>
              <textarea
                required
                rows={7}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type WhatsApp notification in Tamil or English..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-sans leading-relaxed"
              />
            </div>

            {/* Action Buttons for Individual Send */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleDirectWhatsApp}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open WhatsApp App / Web (நேரடி WhatsApp)</span>
              </button>

              <button
                type="button"
                disabled={sending}
                onClick={handleIndividualCloudSend}
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold py-3 rounded-2xl text-xs flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-blue-400" />
                <span>{sending ? 'Dispatching...' : 'Dispatch via Cloud Edge Function'}</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
