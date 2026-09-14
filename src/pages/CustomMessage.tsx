import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { fetchStudents } from '../services/studentService'
import { sendCustomWhatsAppMessage } from '../services/notificationService'
import { Student } from '../types/database.types'
import {
  getTamilAbsenceMessage,
  getTamilFeesReminderMessage,
  getTamilMarksReportMessage,
  getTamilGeneralNoticeMessage,
  createWhatsAppChatUrl
} from '../utils/tamilMessages'
import { ArrowLeft, Send, CheckCircle2, MessageSquare, ExternalLink, Sparkles, User, BookOpen, AlertCircle } from 'lucide-react'

export const CustomMessage: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const state = location.state as {
    studentId?: string
    studentName?: string
    parentPhone?: string
    presetType?: 'absence' | 'fees' | 'marks'
    overrideMessage?: string
  } | null

  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>(state?.studentId || '')
  const [messageText, setMessageText] = useState(state?.overrideMessage || '')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message?: string } | null>(null)

  useEffect(() => {
    fetchStudents().then(data => {
      setStudents(data)
      const targetId = selectedStudentId || (data.length > 0 ? data[0].id : '')
      if (targetId) {
        setSelectedStudentId(targetId)
        const s = data.find(item => item.id === targetId)
        if (s && !messageText) {
          if (state?.overrideMessage) {
            setMessageText(state.overrideMessage)
          } else if (state?.presetType === 'fees') {
            setMessageText(getTamilFeesReminderMessage({ studentName: s.name, className: s.class_name, parentName: s.parent_name }))
          } else {
            setMessageText(getTamilAbsenceMessage({ studentName: s.name, className: s.class_name, parentName: s.parent_name }))
          }
        }
      }
    })
  }, [])

  const selectedStudent = students.find(s => s.id === selectedStudentId)

  // Quick Tamil Template selector
  const applyTemplate = (type: 'absence' | 'fees' | 'marks' | 'holiday') => {
    if (!selectedStudent) return
    const params = {
      studentName: selectedStudent.name,
      className: selectedStudent.class_name,
      parentName: selectedStudent.parent_name
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

  const handleDirectWhatsApp = () => {
    if (!selectedStudent || !messageText.trim()) return
    const phone = selectedStudent.whatsapp_phone || selectedStudent.parent_phone
    const url = createWhatsAppChatUrl(phone, messageText)
    window.open(url, '_blank')
  }

  const handleCloudSend = async (e: React.FormEvent) => {
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
        message: `WhatsApp message dispatched successfully to ${selectedStudent.parent_name} (${parentPhone})`
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
              WhatsApp Notifications
            </h1>
            <p className="text-[10px] text-emerald-400 font-semibold">தமிழ் & Cloud Dispatch Engine</p>
          </div>
          <div className="w-9 h-9"></div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {result && (
          <div className={`p-4 rounded-2xl border text-xs flex items-start space-x-2.5 ${
            result.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{result.message}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">Select Student & Parent</label>
          <select
            value={selectedStudentId}
            onChange={(e) => {
              const newId = e.target.value
              setSelectedStudentId(newId)
              const s = students.find(item => item.id === newId)
              if (s) {
                setMessageText(getTamilAbsenceMessage({ studentName: s.name, className: s.class_name, parentName: s.parent_name }))
              }
            }}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            {students.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.class_name}) • Parent: {s.parent_name} ({s.parent_phone})
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
            <p className="text-slate-400 text-[11px]">Parent: <span className="text-slate-200">{selectedStudent.parent_name}</span></p>
            <p className="text-slate-400 text-[11px]">WhatsApp: <span className="text-emerald-400 font-mono font-medium">{selectedStudent.whatsapp_phone || selectedStudent.parent_phone}</span></p>
          </div>
        )}

        {/* Quick Tamil Templates */}
        <div className="space-y-2">
          <div className="flex items-center space-x-1 text-xs font-semibold text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Tamil Templates (தமிழ் டெம்ப்ளேட்கள்):</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => applyTemplate('absence')}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-rose-500/30 text-rose-300 text-[11px] font-semibold text-left transition-all active:scale-95"
            >
              🚨 வருகையின்மை (Absent)
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('fees')}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-amber-300 text-[11px] font-semibold text-left transition-all active:scale-95"
            >
              💰 கட்டண நினைவூட்டல் (Fee)
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('marks')}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-blue-500/30 text-blue-300 text-[11px] font-semibold text-left transition-all active:scale-95"
            >
              📊 தேர்வு மதிப்பெண் (Marks)
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('holiday')}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold text-left transition-all active:scale-95"
            >
              📢 விடுமுறை அறிவிப்பு (Holiday)
            </button>
          </div>
        </div>

        {/* Message Input & Live Preview */}
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

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          {/* Direct 1-Click WhatsApp Send */}
          <button
            type="button"
            onClick={handleDirectWhatsApp}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all active:scale-95"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open WhatsApp App / Web (நேரடி WhatsApp)</span>
          </button>

          {/* Cloud Automated Dispatch */}
          <button
            type="button"
            disabled={sending}
            onClick={handleCloudSend}
            className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold py-3 rounded-2xl text-xs flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5 text-blue-400" />
            <span>{sending ? 'Dispatching...' : 'Dispatch via Cloud Edge Function'}</span>
          </button>
        </div>
      </main>
    </div>
  )
}
