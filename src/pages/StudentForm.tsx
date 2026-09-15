import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createStudent, fetchStudentById, updateStudent, deleteStudent } from '../services/studentService'
import { ClassName, FeeStatus } from '../types/database.types'
import { ArrowLeft, Save, User, Phone, School, DollarSign, ShieldCheck, Calendar } from 'lucide-react'

export const StudentForm: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [className, setClassName] = useState<ClassName>('12th')
  const [parentPhone, setParentPhone] = useState('')
  const [whatsappPhone, setWhatsappPhone] = useState('')
  const [school, setSchool] = useState('')
  const [joiningDate, setJoiningDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [monthlyFee, setMonthlyFee] = useState<number>(1500)
  const [feeStatus, setFeeStatus] = useState<FeeStatus>('PENDING')
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (id) {
      fetchStudentById(id).then(s => {
        if (s) {
          setName(s.name)
          setClassName(s.class_name)
          setParentPhone(s.parent_phone)
          setWhatsappPhone(s.whatsapp_phone)
          setSchool(s.school || '')
          setJoiningDate(s.joining_date || new Date().toISOString().split('T')[0])
          setMonthlyFee(s.monthly_fee ?? 1500)
          setFeeStatus(s.fee_status || 'PENDING')
          setActive(s.active)
        }
      })
    }
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      name,
      class_name: className,
      parent_phone: parentPhone,
      whatsapp_phone: whatsappPhone || parentPhone,
      school,
      joining_date: joiningDate,
      monthly_fee: Number(monthlyFee) || 0,
      fee_status: feeStatus,
      active
    }

    if (isEdit && id) {
      await updateStudent(id, payload)
    } else {
      await createStudent(payload)
    }

    setSaving(false)
    navigate('/students')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 max-w-md mx-auto relative">
      <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-extrabold text-base text-white tracking-tight">
            {isEdit ? 'Edit Student Details' : 'Add New Student'}
          </h1>
          <div className="w-9 h-9"></div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">Academic Class</label>
          <div className="grid grid-cols-3 gap-2">
            {(['10th', '11th', '12th'] as ClassName[]).map(c => (
              <button
                type="button"
                key={c}
                onClick={() => setClassName(c)}
                className={`py-2.5 rounded-xl font-bold text-xs border transition-all ${
                  className === c
                    ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {c} Standard
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">Student Full Name</label>
          <div className="relative">
            <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Sundaram"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">School Name</label>
          <div className="relative">
            <School className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="e.g. Vidya Mandir High School"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>



        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">Parent Contact Phone</label>
          <div className="relative">
            <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="tel"
              required
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              placeholder="e.g. +91 98402 34500"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">Parent WhatsApp Number</label>
          <input
            type="tel"
            value={whatsappPhone}
            onChange={(e) => setWhatsappPhone(e.target.value)}
            placeholder="Same as contact phone if left blank"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">Joining Date</label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="date"
                required
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">Monthly Fee (₹)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₹</span>
              <input
                type="number"
                required
                min="0"
                step="50"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(Number(e.target.value))}
                placeholder="1500"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">Current Fee Payment Status</label>
          <div className="grid grid-cols-4 gap-1.5">
            {(['PAID', 'PENDING', 'PARTIAL', 'OVERDUE'] as FeeStatus[]).map((status) => (
              <button
                type="button"
                key={status}
                onClick={() => setFeeStatus(status)}
                className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${
                  feeStatus === status
                    ? status === 'PAID'
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-600/30'
                      : status === 'PENDING'
                      ? 'bg-amber-600 border-amber-500 text-white shadow-md shadow-amber-600/30'
                      : status === 'PARTIAL'
                      ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/30'
                      : 'bg-rose-600 border-rose-500 text-white shadow-md shadow-rose-600/30'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="font-semibold text-xs text-white block">Active Enrollment</span>
            <span className="text-[11px] text-slate-400">Include in daily roll call</span>
          </div>
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
          />
        </div>

        <div className="pt-4 space-y-2.5">
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-blue-600/30 flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : isEdit ? 'Update Student Profile' : 'Save Student'}</span>
          </button>

          {isEdit && id && (
            <button
              type="button"
              onClick={async () => {
                if (window.confirm(`Delete ${name || 'this student'}?`)) {
                  setSaving(true)
                  await deleteStudent(id)
                  navigate('/students')
                }
              }}
              className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold py-3 rounded-2xl text-xs flex items-center justify-center space-x-2 transition-all"
            >
              <span>Delete Student</span>
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
