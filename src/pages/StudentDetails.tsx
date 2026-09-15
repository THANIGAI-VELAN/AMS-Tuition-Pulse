import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchStudentById, deleteStudent, updateStudent } from '../services/studentService'
import { fetchFeeRecordsForStudent, updateFeeRecord, addCustomFeeRecord, getMonthName } from '../services/feeService'
import { Student, FeeStatus, FeeRecord } from '../types/database.types'
import { getTamilMultiMonthFeeMessage, getTamilFeesReminderMessage } from '../utils/tamilMessages'
import { ArrowLeft, Edit3, Phone, MessageSquare, Trash2, Send, ShieldAlert, Calendar, CreditCard, DollarSign, PlusCircle, CheckCircle, AlertTriangle, Clock } from 'lucide-react'

export const StudentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [student, setStudent] = useState<Student | null>(null)
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Add Custom Arrears Month Modal State
  const [showAddFeeModal, setShowAddFeeModal] = useState(false)
  const [customMonth, setCustomMonth] = useState<number>(new Date().getMonth() + 1)
  const [customYear, setCustomYear] = useState<number>(new Date().getFullYear())
  const [customAmount, setCustomAmount] = useState<number>(1500)
  const [customStatus, setCustomStatus] = useState<FeeStatus>('PENDING')

  const loadFeeRecords = async (stu: Student) => {
    const records = await fetchFeeRecordsForStudent(stu.id, stu.joining_date, stu.monthly_fee || 1500)
    setFeeRecords(records)
  }

  useEffect(() => {
    if (id) {
      fetchStudentById(id).then(s => {
        setStudent(s)
        if (s) {
          loadFeeRecords(s)
        }
        setLoading(false)
      })
    }
  }, [id])

  const handleUpdateMonthStatus = async (feeId: string, newStatus: FeeStatus, amountDue: number) => {
    const updated = await updateFeeRecord(feeId, {
      status: newStatus,
      amount_paid: newStatus === 'PAID' ? amountDue : 0,
      payment_date: newStatus === 'PAID' ? new Date().toISOString() : undefined
    })

    if (updated) {
      setFeeRecords(prev => prev.map(f => f.id === feeId ? updated : f))
      // Update overall student fee status badge if needed
      if (student) {
        const hasOverdue = feeRecords.some(f => (f.id === feeId ? updated.status : f.status) === 'OVERDUE')
        const hasPending = feeRecords.some(f => (f.id === feeId ? updated.status : f.status) === 'PENDING')
        const overallStatus: FeeStatus = hasOverdue ? 'OVERDUE' : hasPending ? 'PENDING' : 'PAID'
        if (student.fee_status !== overallStatus) {
          updateStudent(student.id, { fee_status: overallStatus }).then(u => {
            if (u) setStudent(u)
          })
        }
      }
    }
  }

  const handleAddCustomFee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!student) return

    await addCustomFeeRecord(student.id, Number(customMonth), Number(customYear), Number(customAmount), customStatus)
    await loadFeeRecords(student)
    setShowAddFeeModal(false)
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center text-xs text-slate-500">Loading student profile & fee history...</div>
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 text-center space-y-4">
        <p className="text-xs text-slate-400">Student record not found</p>
        <button onClick={() => navigate('/students')} className="text-xs text-blue-400 font-semibold">Back to Students</button>
      </div>
    )
  }

  const unpaidRecords = feeRecords.filter(f => f.status === 'PENDING' || f.status === 'OVERDUE' || f.status === 'PARTIAL')
  const totalBalanceDue = unpaidRecords.reduce((sum, f) => sum + (f.amount_due - f.amount_paid), 0)
  const unpaidMonthsListStr = unpaidRecords.map(f => `${getMonthName(f.month)} ${f.year}`).join(', ')

  const handleOpenWhatsApp = () => {
    const rawPhone = student.whatsapp_phone || student.parent_phone
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '')
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone
    const msg = `வணக்கம் பெற்றோர்களே,

SP Academy டியூஷன் மையத்திலிருந்து மாணவர் *${student.name}* (${student.class_name}) தொடர்பாக தொடர்பு கொள்கிறோம்.

நன்றி,
*SP Academy*`
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleSendMultiMonthFeeReminder = () => {
    if (!student) return

    let reminderMsg = ''
    if (unpaidRecords.length > 0) {
      reminderMsg = getTamilMultiMonthFeeMessage({
        studentName: student.name,
        className: student.class_name,
        unpaidMonthsText: `${unpaidMonthsListStr} (${unpaidRecords.length} மாதங்கள்)`,
        totalAmountDue: totalBalanceDue
      })
    } else {
      reminderMsg = getTamilFeesReminderMessage({
        studentName: student.name,
        className: student.class_name,
        amount: student.monthly_fee || 1500
      })
    }

    navigate('/custom-message', {
      state: {
        studentId: student.id,
        studentName: student.name,
        parentPhone: student.whatsapp_phone || student.parent_phone,
        presetType: 'fees',
        overrideMessage: reminderMsg
      }
    })
  }

  const handleDelete = async () => {
    if (!student) return
    setDeleting(true)
    await deleteStudent(student.id)
    setDeleting(false)
    navigate('/students')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 max-w-md mx-auto relative">
      <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/students')}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-extrabold text-base text-white tracking-tight">Student Profile</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-bold"
              title="Delete student"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate(`/students/edit/${student.id}`)}
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-blue-400 hover:text-blue-300 flex items-center space-x-1 text-xs font-bold"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit</span>
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Profile Overview Header Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-center space-y-3 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center mx-auto shadow-lg shadow-blue-600/30">
            {student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>

          <div>
            <div className="flex items-center justify-center space-x-2">
              <h2 className="text-lg font-extrabold text-white">{student.name}</h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                student.active
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {student.active ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Class {student.class_name} Standard • {student.school || 'Regular Batch'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <a
              href={`tel:${student.parent_phone}`}
              className="py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center space-x-1.5 hover:bg-slate-700 transition-all"
            >
              <Phone className="w-3.5 h-3.5 text-blue-400" />
              <span>Call Parent</span>
            </a>

            <button
              onClick={handleOpenWhatsApp}
              className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/20 transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Total Outstanding Fee Summary Box */}
        <div className={`p-4 rounded-3xl border shadow-xl flex items-center justify-between ${
          totalBalanceDue > 0
            ? 'bg-gradient-to-r from-amber-950/60 to-rose-950/60 border-amber-500/30'
            : 'bg-gradient-to-r from-emerald-950/50 to-teal-950/50 border-emerald-500/30'
        }`}>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Total Unpaid Balance</span>
            <div className="flex items-baseline space-x-2">
              <span className={`text-xl font-black ${totalBalanceDue > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                ₹{totalBalanceDue.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-slate-400">
                ({unpaidRecords.length} month{unpaidRecords.length !== 1 ? 's' : ''} pending)
              </span>
            </div>
          </div>

          <button
            onClick={handleSendMultiMonthFeeReminder}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md transition-all shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Notice</span>
          </button>
        </div>

        {/* Month-by-Month Fee History Ledger */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Monthly Fee History Ledger</span>
            </h3>

            <button
              onClick={() => setShowAddFeeModal(true)}
              className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center space-x-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Past Fee</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {feeRecords.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No fee records found.</p>
            ) : (
              feeRecords.map(rec => {
                const monthName = getMonthName(rec.month)
                const isPaid = rec.status === 'PAID'
                const isPending = rec.status === 'PENDING'
                const isOverdue = rec.status === 'OVERDUE'

                return (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <div>
                          <span className="font-bold text-xs text-white">{monthName} {rec.year}</span>
                          <span className="text-[10px] text-slate-500 block">Due: ₹{rec.amount_due.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                        isPaid
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : isPending
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : isOverdue
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      }`}>
                        {rec.status}
                      </span>
                    </div>

                    {/* Quick Action Toggle Buttons per Month */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px]">
                      <span className="text-slate-500">
                        {isPaid && rec.payment_date
                          ? `Paid on ${new Date(rec.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
                          : 'Update month status:'}
                      </span>

                      <div className="flex items-center space-x-1">
                        {(['PAID', 'PENDING', 'OVERDUE'] as FeeStatus[]).map(st => (
                          <button
                            key={st}
                            onClick={() => handleUpdateMonthStatus(rec.id, st, rec.amount_due)}
                            className={`px-2 py-0.5 rounded-lg font-bold border transition-all ${
                              rec.status === st
                                ? st === 'PAID'
                                  ? 'bg-emerald-600 border-emerald-500 text-white'
                                  : st === 'PENDING'
                                  ? 'bg-amber-600 border-amber-500 text-white'
                                  : 'bg-rose-600 border-rose-500 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Enrollment & Basic Details Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3.5 shadow-xl">
          <h3 className="font-bold text-sm text-white">Enrollment Info</h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-400">Joining Date:</span>
              <span className="font-bold text-white">
                {student.joining_date ? new Date(student.joining_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-400">Class Batch:</span>
              <span className="font-bold text-white">{student.class_name} Standard</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-400">Primary Phone:</span>
              <span className="font-mono text-slate-200">{student.parent_phone}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-400">WhatsApp Phone:</span>
              <span className="font-mono text-emerald-400">{student.whatsapp_phone || student.parent_phone}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Add Custom Past Month Fee Modal */}
      {showAddFeeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddCustomFee} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-white">Add Past Month Fee Record</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Month</label>
                <select
                  value={customMonth}
                  onChange={(e) => setCustomMonth(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {Array.from({ length: 12 }, (_, idx) => (
                    <option key={idx + 1} value={idx + 1}>{getMonthName(idx + 1)}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Year</label>
                <input
                  type="number"
                  value={customYear}
                  onChange={(e) => setCustomYear(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Fee Amount (₹)</label>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Initial Status</label>
              <div className="grid grid-cols-3 gap-2">
                {(['OVERDUE', 'PENDING', 'PAID'] as FeeStatus[]).map(st => (
                  <button
                    type="button"
                    key={st}
                    onClick={() => setCustomStatus(st)}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      customStatus === st
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddFeeModal(false)}
                className="py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md"
              >
                Save Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm space-y-4 animate-in fade-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-base text-white">Delete Student?</h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to delete <span className="text-white font-semibold">{student.name}</span>? This will remove their record from Supabase.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={handleDelete}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

