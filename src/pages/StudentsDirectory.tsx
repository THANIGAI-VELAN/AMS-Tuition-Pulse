import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { NavigationBar } from '../components/layout/NavigationBar'
import { fetchStudents, getCachedStudents, deleteStudent } from '../services/studentService'
import { Student } from '../types/database.types'
import { Search, Plus, Phone, MessageSquare, ChevronRight, UserPlus, Trash2, ShieldAlert } from 'lucide-react'

export const StudentsDirectory: React.FC = () => {
  const navigate = useNavigate()
  const [students, setStudents] = useState<Student[]>(() => getCachedStudents())
  const [selectedClass, setSelectedClass] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(() => getCachedStudents().length === 0)
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let isMounted = true
    fetchStudents().then(data => {
      if (isMounted) {
        setStudents(data)
        setLoading(false)
      }
    }).catch(() => {
      if (isMounted) setLoading(false)
    })
    return () => { isMounted = false }
  }, [])

  const filtered = students.filter(s => {
    const matchesClass = selectedClass === 'All' || s.class_name === selectedClass
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.parent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.parent_phone.includes(searchQuery)
    return matchesClass && matchesSearch
  })

  const handleOpenWhatsApp = (student: Student) => {
    const phone = student.whatsapp_phone || student.parent_phone
    const msg = `வணக்கம் ${student.parent_name || ''} அவர்களே,

SP Academy டியூஷன் மையத்திலிருந்து மாணவர் *${student.name}* (${student.class_name}) தொடர்பாக தொடர்பு கொள்கிறோம்.

நன்றி,
*SP Academy*`
    const cleaned = phone.replace(/[^0-9]/g, '')
    const formatted = cleaned.length === 10 ? `91${cleaned}` : cleaned
    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return
    setDeleting(true)
    const targetId = studentToDelete.id
    await deleteStudent(targetId)
    setStudents(prev => prev.filter(s => s.id !== targetId))
    setDeleting(false)
    setStudentToDelete(null)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 max-w-md mx-auto relative">
      <Header title="SP Academy" subtitle="Students Directory" />

      <main className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Students</h2>
            <p className="text-xs text-slate-400 font-medium">
              {students.length} student{students.length !== 1 ? 's' : ''} enrolled
            </p>
          </div>

          <button
            onClick={() => navigate('/students/add')}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow-lg shadow-blue-600/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto">
          {['All', '10th', '11th', '12th'].map(cls => (
            <button
              key={cls}
              onClick={() => setSelectedClass(cls)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedClass === cls
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cls === 'All' ? 'All Classes' : `${cls} Standard`}
            </button>
          ))}
        </div>

        {students.length > 0 && (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student, parent, or phone..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        )}

        {loading && students.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">Loading directory...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {students.length === 0 ? 'No Students Added Yet' : 'No Students Match Filter'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {students.length === 0
                  ? 'Click the button below to register your first student.'
                  : 'Try searching with a different name or phone number.'}
              </p>
            </div>
            {students.length === 0 && (
              <button
                onClick={() => navigate('/students/add')}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all inline-flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Student</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => (
              <div
                key={s.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 hover:border-slate-700 transition-all shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div
                    onClick={() => navigate(`/students/${s.id}`)}
                    className="flex items-center space-x-3 cursor-pointer flex-1"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-sm flex items-center justify-center shadow-md shrink-0">
                      {s.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-sm text-white hover:text-blue-400 transition-colors">{s.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          s.active
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {s.active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium">
                        {s.class_name} Standard • {s.school || 'Tuition Regular'}
                      </p>
                      <div className="flex items-center space-x-2 pt-1">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                          (s.fee_status || 'PENDING') === 'PAID'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : (s.fee_status || 'PENDING') === 'PENDING'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}>
                          Fee: {s.fee_status || 'PENDING'} (₹{s.monthly_fee || 1500})
                        </span>
                        {s.joining_date && (
                          <span className="text-[10px] text-slate-400">
                            Joined: {new Date(s.joining_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setStudentToDelete(s)}
                      className="text-slate-500 hover:text-rose-400 p-2 rounded-xl hover:bg-rose-500/10 transition-colors"
                      title="Delete Student"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/students/${s.id}`)}
                      className="text-slate-500 hover:text-slate-200 p-1"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px]">Parent: </span>
                    <span className="text-slate-300 font-medium">{s.parent_name}</span>
                    <span className="text-slate-400 text-[11px] block">{s.parent_phone}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <a
                      href={`tel:${s.parent_phone}`}
                      className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                      title="Call Parent"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => handleOpenWhatsApp(s)}
                      className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all flex items-center space-x-1 font-semibold text-[11px]"
                      title="Launch WhatsApp Chat"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm space-y-4 animate-in fade-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-base text-white">Delete Student?</h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to delete <span className="text-white font-semibold">{studentToDelete.name}</span>? This will remove the record from both the app and Supabase.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                disabled={deleting}
                onClick={() => setStudentToDelete(null)}
                className="py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={handleDeleteConfirm}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <NavigationBar />
    </div>
  )
}
