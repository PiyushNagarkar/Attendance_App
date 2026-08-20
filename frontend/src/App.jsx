import { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/browser'
import './App.css'

const API = 'http://127.0.0.1:8000'

// --- SVG Icons Helper ---
function Icon({ name, size = 18, className = '' }) {
  const icons = {
    check: <polyline points="20 6 9 17 4 12" />,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    qr: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 18h1v3h-1zM18 14h3v1h-3z" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    building: (
      <>
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
        <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" />
      </>
    ),
    book: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </>
    ),
    list: (
      <>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </>
    ),
    overview: (
      <>
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </>
    ),
    location: (
      <>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </>
    ),
    camera: (
      <>
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </>
    ),
    download: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </>
    ),
    trash: (
      <>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </>
    ),
    plus: (
      <>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`svg-icon ${className}`}
    >
      {icons[name] || null}
    </svg>
  )
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('attendance_token') || '')
  const [role, setRole] = useState(localStorage.getItem('attendance_role') || '')
  const [name, setName] = useState(localStorage.getItem('attendance_name') || '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState({ text: '', type: 'info' })

  // Teacher state
  const [courses, setCourses] = useState([])
  const [courseId, setCourseId] = useState('')
  const [minutes, setMinutes] = useState('15')
  const [session, setSession] = useState(null)
  const [roster, setRoster] = useState([])
  const [enrolledStatus, setEnrolledStatus] = useState([])
  const [report, setReport] = useState(null)
  const [reportThreshold, setReportThreshold] = useState('75')

  // Student state
  const [studentData, setStudentData] = useState(null)
  const [qrToken, setQrToken] = useState('')
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef(null)
  const scanControls = useRef(null)

  const showNotice = (text, type = 'info') => {
    setNotice({ text, type })
  }

  const request = async (path, options = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
    const type = response.headers.get('content-type') || ''
    const data = type.includes('application/json') ? await response.json() : await response.blob()
    if (!response.ok) throw new Error(data.detail || 'Something went wrong')
    return data
  }

  const loadTeacher = async () => {
    const x = await request('/teacher/courses')
    setCourses(x)
    if (x[0] && !courseId) setCourseId(String(x[0].id))
  }

  const loadStudent = async () => {
    const [dashboard, notifications] = await Promise.all([
      request('/student/dashboard'),
      request('/student/notifications'),
    ])
    setStudentData({ dashboard, notifications })
  }

  useEffect(() => {
    if (!token) return
    ;(async () => {
      try {
        if (role === 'teacher') await loadTeacher()
        if (role === 'student') await loadStudent()
      } catch (e) {
        showNotice(e.message, 'error')
      }
    })()
  }, [token, role])

  // Teacher active session polling & QR refresh
  useEffect(() => {
    if (!session) return
    const fetchRoster = async () => {
      try {
        const [r, en] = await Promise.all([
          request(`/teacher/sessions/${session.session_id}/roster`),
          request(`/teacher/sessions/${session.session_id}/enrolled-status`),
        ])
        setRoster(r)
        setEnrolledStatus(en)
      } catch {}
    }
    fetchRoster()
    const rosterTimer = setInterval(fetchRoster, 3500)

    const qrTimer = setInterval(async () => {
      try {
        const refreshed = await request(`/teacher/sessions/${session.session_id}/refresh-qr`, { method: 'POST' })
        setSession(refreshed)
      } catch (e) {
        showNotice(e.message, 'error')
      }
    }, 25000)

    return () => {
      clearInterval(rosterTimer)
      clearInterval(qrTimer)
    }
  }, [session?.session_id])

  useEffect(() => () => scanControls.current?.stop(), [])

  const login = async (e) => {
    e.preventDefault()
    try {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      for (const [k, v] of Object.entries({
        attendance_token: data.access_token,
        attendance_role: data.role,
        attendance_name: data.name,
      })) {
        localStorage.setItem(k, v)
      }
      setToken(data.access_token)
      setRole(data.role)
      setName(data.name)
      showNotice(`Welcome back, ${data.name}! Signed in as ${data.role}.`, 'success')
    } catch (e) {
      showNotice(e.message, 'error')
    }
  }

  const logout = () => {
    scanControls.current?.stop()
    localStorage.clear()
    setToken('')
    setRole('')
    setName('')
    setSession(null)
    showNotice('Successfully signed out of portal.', 'info')
  }

  const createSession = async () => {
    try {
      const data = await request('/teacher/sessions', {
        method: 'POST',
        body: JSON.stringify({ course_id: Number(courseId), duration_minutes: Number(minutes) }),
      })
      setSession(data)
      setRoster([])
      showNotice('Attendance session launched! Projector QR is active & rotating every 25s.', 'success')
    } catch (e) {
      showNotice(e.message, 'error')
    }
  }

  const closeSession = async () => {
    try {
      const data = await request(`/teacher/sessions/${session.session_id}/close`, { method: 'POST' })
      showNotice(data.message, 'success')
      setSession(null)
    } catch (e) {
      showNotice(e.message, 'error')
    }
  }

  const manualMark = async (studentId, status) => {
    try {
      const data = await request(`/teacher/sessions/${session.session_id}/manual-mark`, {
        method: 'POST',
        body: JSON.stringify({ student_id: studentId, status }),
      })
      showNotice(data.message, 'success')
      const [r, en] = await Promise.all([
        request(`/teacher/sessions/${session.session_id}/roster`),
        request(`/teacher/sessions/${session.session_id}/enrolled-status`),
      ])
      setRoster(r)
      setEnrolledStatus(en)
    } catch (e) {
      showNotice(e.message, 'error')
    }
  }

  const checkIn = () => {
    if (!qrToken) return showNotice('Please scan the live classroom QR first.', 'warning')
    showNotice('Validating classroom GPS Geofence & satellites...', 'info')
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const x = await request('/student/check-in', {
            method: 'POST',
            body: JSON.stringify({
              token: qrToken,
              latitude: coords.latitude,
              longitude: coords.longitude,
              gps_accuracy_m: coords.accuracy,
            }),
          })
          showNotice(x.message, 'success')
          setQrToken('')
          await loadStudent()
        } catch (e) {
          showNotice(e.message, 'error')
        }
      },
      (err) => showNotice(`Location Error: ${err.message}. Please enable High Accuracy Location access.`, 'error'),
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  const startScanner = async () => {
    try {
      setScanning(true)
      const reader = new BrowserQRCodeReader()
      scanControls.current = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (result) {
          setQrToken(result.getText())
          scanControls.current?.stop()
          setScanning(false)
          showNotice('✓ QR code detected! Click "Verify Location & Mark Attendance".', 'success')
        }
      })
    } catch {
      setScanning(false)
      showNotice('Unable to access camera. Please allow camera permissions in browser settings.', 'error')
    }
  }

  const stopScanner = () => {
    scanControls.current?.stop()
    setScanning(false)
  }

  const loadReport = async () => {
    try {
      setReport(await request(`/teacher/courses/${courseId}/report?threshold=${reportThreshold}`))
    } catch (e) {
      showNotice(e.message, 'error')
    }
  }

  const download = async (type) => {
    try {
      const blob = await request(`/teacher/courses/${courseId}/report.${type}`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance-report.${type}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      showNotice(e.message, 'error')
    }
  }

  // Quick fill for testing credentials
  const fillCredentials = (roleType) => {
    if (roleType === 'admin') {
      setEmail('admin@attendance.app')
      setPassword('Admin@12345')
    }
  }

  return (
    <div className="campus-app">
      {/* TOP NAVIGATION BAR */}
      <header className="campus-nav">
        <div className="nav-container">
          <div className="brand-group">
            <div className="logo-badge">
              <Icon name="shield" size={20} />
            </div>
            <div>
              <div className="brand-title">Attendly Campus</div>
              <div className="brand-subtitle">Smart University Attendance Portal</div>
            </div>
          </div>

          <div className="nav-right">
            <div className="semester-tag">
              <span className="live-dot"></span> Academic Year 2025–26 (Semester 2)
            </div>

            {token && (
              <div className="user-profile-chip">
                <div className="avatar-circle">{name.charAt(0).toUpperCase()}</div>
                <div className="user-info">
                  <span className="user-name">{name}</span>
                  <span className={`user-role-tag role-${role}`}>{role}</span>
                </div>
                <button className="icon-btn logout-btn" onClick={logout} title="Sign Out">
                  <Icon name="logout" size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        {!token ? (
          <div className="auth-hero-wrapper">
            <div className="auth-hero-intro">
              <div className="hero-pill">
                <Icon name="sparkles" size={14} /> Next-Gen Higher-Ed Attendance
              </div>
              <h1 className="hero-heading">
                Smart Geofenced QR <br />
                <span className="gradient-text">Attendance for Colleges</span>
              </h1>
              <p className="hero-desc">
                Eliminate proxy attendance with 25-second rotating cryptographic QR tokens, classroom GPS geofencing, real-time live lecture rosters, and automated defaulter alerts.
              </p>

              <div className="features-grid">
                <div className="feat-card">
                  <div className="feat-icon"><Icon name="qr" size={20} /></div>
                  <div>
                    <h4>Dynamic 25s QR</h4>
                    <p>Rotating anti-screenshot tokens.</p>
                  </div>
                </div>
                <div className="feat-card">
                  <div className="feat-icon"><Icon name="location" size={20} /></div>
                  <div>
                    <h4>Classroom GPS</h4>
                    <p>Sub-room geofence validation.</p>
                  </div>
                </div>
                <div className="feat-card">
                  <div className="feat-icon"><Icon name="overview" size={20} /></div>
                  <div>
                    <h4>Defaulter Reports</h4>
                    <p>Automatic 75% threshold tracking.</p>
                  </div>
                </div>
                <div className="feat-card">
                  <div className="feat-icon"><Icon name="building" size={20} /></div>
                  <div>
                    <h4>Campus Setup</h4>
                    <p>Halls, courses & faculty rosters.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="auth-card-container">
              <div className="card auth-card">
                <div className="auth-header">
                  <div className="auth-icon-circle"><Icon name="shield" size={24} /></div>
                  <h2>Sign in to Campus Portal</h2>
                  <p>Enter your institutional email address to continue</p>
                </div>

                <form onSubmit={login} className="auth-form">
                  <div className="input-group">
                    <label>College Email Address</label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      placeholder="e.g. admin@attendance.app or faculty@college.edu"
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label>Password</label>
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      placeholder="••••••••••••"
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-primary btn-block">
                    Sign in to Portal →
                  </button>
                </form>

                <div className="demo-accounts-box">
                  <span className="demo-label">Quick Test Sign In:</span>
                  <div className="demo-btns">
                    <button type="button" className="btn-chip" onClick={() => fillCredentials('admin')}>
                      Fill Admin Demo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : role === 'admin' ? (
          <CollegeAdminPortal request={request} showNotice={showNotice} />
        ) : role === 'teacher' ? (
          <CollegeFacultyPortal
            courses={courses}
            courseId={courseId}
            setCourseId={setCourseId}
            minutes={minutes}
            setMinutes={setMinutes}
            createSession={createSession}
            session={session}
            roster={roster}
            enrolledStatus={enrolledStatus}
            manualMark={manualMark}
            closeSession={closeSession}
            loadReport={loadReport}
            report={report}
            reportThreshold={reportThreshold}
            setReportThreshold={setReportThreshold}
            download={download}
          />
        ) : (
          <CollegeStudentPortal
            studentData={studentData}
            scanning={scanning}
            videoRef={videoRef}
            startScanner={startScanner}
            stopScanner={stopScanner}
            qrToken={qrToken}
            setQrToken={setQrToken}
            checkIn={checkIn}
          />
        )}
      </main>

      {/* FLOATING NOTIFICATION TOAST */}
      {notice.text && (
        <div className={`toast-notification toast-${notice.type}`}>
          <div className="toast-content">
            <span className="toast-indicator"></span>
            <span>{notice.text}</span>
          </div>
          <button className="toast-close" onClick={() => setNotice({ text: '', type: 'info' })}>
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

// =========================================================================
// 1. COLLEGE ADMIN MANAGEMENT PORTAL
// =========================================================================
function CollegeAdminPortal({ request, showNotice }) {
  const [tab, setTab] = useState('overview')
  const [dashboard, setDashboard] = useState(null)
  const [users, setUsers] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [courses, setCourses] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all')

  // Forms
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'student' })
  const [userSubTab, setUserSubTab] = useState('single') // 'single' | 'bulk'
  const [bulkUsersPreview, setBulkUsersPreview] = useState([])
  const [bulkDefaultPassword, setBulkDefaultPassword] = useState('Student@123')
  const [bulkCourseId, setBulkCourseId] = useState('')
  const [bulkProcessing, setBulkProcessing] = useState(false)

  const [roomForm, setRoomForm] = useState({
    building: 'Main Academic Block',
    room_number: '',
    floor: '1',
    latitude: '',
    longitude: '',
    radius_m: '25',
  })
  const [courseForm, setCourseForm] = useState({ code: '', name: '', section: 'A', classroom_id: '', teacher_id: '' })
  const [enrollForm, setEnrollForm] = useState({ course_id: '', student_id: '' })
  const [isGeoDetecting, setIsGeoDetecting] = useState(false)

  const loadAll = async () => {
    try {
      const [d, u, cl, co, en] = await Promise.all([
        request('/admin/dashboard'),
        request('/admin/users'),
        request('/admin/classrooms'),
        request('/admin/courses'),
        request('/admin/enrollments'),
      ])
      setDashboard(d)
      setUsers(u)
      setClassrooms(cl)
      setCourses(co)
      setEnrollments(en)

      const teachers = u.filter((x) => x.role === 'teacher')
      const students = u.filter((x) => x.role === 'student')

      if (cl[0] && !courseForm.classroom_id) setCourseForm((prev) => ({ ...prev, classroom_id: String(cl[0].id) }))
      if (teachers[0] && !courseForm.teacher_id) setCourseForm((prev) => ({ ...prev, teacher_id: String(teachers[0].id) }))
      if (co[0] && !enrollForm.course_id) setEnrollForm((prev) => ({ ...prev, course_id: String(co[0].id) }))
      if (students[0] && !enrollForm.student_id) setEnrollForm((prev) => ({ ...prev, student_id: String(students[0].id) }))
    } catch (e) {
      showNotice(e.message, 'error')
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  // Create Single User
  const handleCreateUser = async (e) => {
    e.preventDefault()
    try {
      await request('/admin/users', { method: 'POST', body: JSON.stringify(userForm) })
      showNotice(`✓ User "${userForm.name}" registered successfully as ${userForm.role.toUpperCase()}!`, 'success')
      setUserForm({ name: '', email: '', password: '', role: 'student' })
      loadAll()
    } catch (err) {
      showNotice(err.message, 'error')
    }
  }

  // CSV Parsing & Bulk Import Handlers
  const handleCsvFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
      if (!lines.length) return
      
      const firstLine = lines[0].toLowerCase()
      const startIndex = (firstLine.includes('name') || firstLine.includes('email')) ? 1 : 0

      const parsed = []
      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''))
        if (parts.length >= 2 && parts[0] && parts[1]) {
          parsed.push({
            name: parts[0],
            email: parts[1],
            password: parts[2] || '',
            role: (parts[3] && parts[3].toLowerCase() === 'teacher') ? 'teacher' : 'student',
          })
        }
      }
      setBulkUsersPreview(parsed)
      showNotice(`✓ Loaded ${parsed.length} student records from CSV! Review preview and click "Import".`, 'success')
    }
    reader.readAsText(file)
  }

  const handleDownloadSampleCsv = () => {
    const sample = "name,email,password\nAlex Johnson,alex.j@college.edu,Student@123\nEmily Clark,emily.c@college.edu,Student@123\nMichael Smith,michael.s@college.edu,Student@123\nSophia Davis,sophia.d@college.edu,Student@123\nDavid Wilson,david.w@college.edu,Student@123"
    const blob = new Blob([sample], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'students_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExecuteBulkImport = async () => {
    if (!bulkUsersPreview.length) {
      return showNotice('Please choose a CSV file with student records first.', 'warning')
    }
    setBulkProcessing(true)
    showNotice(`Processing batch import of ${bulkUsersPreview.length} students...`, 'info')
    try {
      const res = await request('/admin/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          users: bulkUsersPreview,
          default_password: bulkDefaultPassword,
          course_id: bulkCourseId ? Number(bulkCourseId) : null,
        }),
      })
      showNotice(res.message, 'success')
      setBulkUsersPreview([])
      setBulkProcessing(false)
      loadAll()
    } catch (err) {
      setBulkProcessing(false)
      showNotice(err.message, 'error')
    }
  }

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete user "${name}"?`)) return
    try {
      await request(`/admin/users/${id}`, { method: 'DELETE' })
      showNotice(`Deleted user ${name}`, 'info')
      loadAll()
    } catch (err) {
      showNotice(err.message, 'error')
    }
  }

  // Geolocation auto-detector
  const handleDetectCoordinates = () => {
    setIsGeoDetecting(true)
    showNotice('Requesting high-accuracy GPS coordinates from hardware...', 'info')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setRoomForm((prev) => ({
          ...prev,
          latitude: String(pos.coords.latitude),
          longitude: String(pos.coords.longitude),
        }))
        setIsGeoDetecting(false)
        showNotice(
          `✓ GPS Coordinates Captured: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)} (Accuracy ±${pos.coords.accuracy.toFixed(1)}m)`,
          'success'
        )
      },
      (err) => {
        setIsGeoDetecting(false)
        showNotice(`GPS Capture Failed: ${err.message}`, 'error')
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  // Create Classroom
  const handleCreateClassroom = async (e) => {
    e.preventDefault()
    try {
      await request('/admin/classrooms', {
        method: 'POST',
        body: JSON.stringify({
          building: roomForm.building,
          room_number: roomForm.room_number,
          floor: Number(roomForm.floor),
          latitude: Number(roomForm.latitude),
          longitude: Number(roomForm.longitude),
          radius_m: Number(roomForm.radius_m),
        }),
      })
      showNotice(`✓ Lecture Hall "${roomForm.room_number}" successfully added!`, 'success')
      setRoomForm({
        building: 'Main Academic Block',
        room_number: '',
        floor: '1',
        latitude: '',
        longitude: '',
        radius_m: '25',
      })
      loadAll()
    } catch (err) {
      showNotice(err.message, 'error')
    }
  }

  const handleDeleteClassroom = async (id, room) => {
    if (!window.confirm(`Delete Classroom "${room}"?`)) return
    try {
      await request(`/admin/classrooms/${id}`, { method: 'DELETE' })
      showNotice(`Deleted classroom ${room}`, 'info')
      loadAll()
    } catch (err) {
      showNotice(err.message, 'error')
    }
  }

  // Create Course
  const handleCreateCourse = async (e) => {
    e.preventDefault()
    try {
      await request('/admin/courses', {
        method: 'POST',
        body: JSON.stringify({
          code: courseForm.code,
          name: courseForm.name,
          section: courseForm.section,
          classroom_id: Number(courseForm.classroom_id),
          teacher_id: Number(courseForm.teacher_id),
        }),
      })
      showNotice(`✓ Academic Course "${courseForm.code}" created!`, 'success')
      setCourseForm((prev) => ({ ...prev, code: '', name: '', section: 'A' }))
      loadAll()
    } catch (err) {
      showNotice(err.message, 'error')
    }
  }

  const handleDeleteCourse = async (id, code) => {
    if (!window.confirm(`Delete course "${code}"?`)) return
    try {
      await request(`/admin/courses/${id}`, { method: 'DELETE' })
      showNotice(`Deleted course ${code}`, 'info')
      loadAll()
    } catch (err) {
      showNotice(err.message, 'error')
    }
  }

  // Enroll Student
  const handleEnrollStudent = async (e) => {
    e.preventDefault()
    try {
      await request('/admin/enrollments', {
        method: 'POST',
        body: JSON.stringify({
          course_id: Number(enrollForm.course_id),
          student_id: Number(enrollForm.student_id),
        }),
      })
      showNotice(`✓ Student enrolled in course successfully!`, 'success')
      loadAll()
    } catch (err) {
      showNotice(err.message, 'error')
    }
  }

  const handleDeleteEnrollment = async (id) => {
    try {
      await request(`/admin/enrollments/${id}`, { method: 'DELETE' })
      showNotice('Student un-enrolled from course roster.', 'info')
      loadAll()
    } catch (err) {
      showNotice(err.message, 'error')
    }
  }

  const teacherUsers = users.filter((u) => u.role === 'teacher')
  const studentUsers = users.filter((u) => u.role === 'student')

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredEnrollments = enrollments.filter((en) => {
    if (selectedCourseFilter === 'all') return true
    return String(en.course_id) === selectedCourseFilter
  })

  return (
    <div className="admin-portal-wrapper">
      {/* ADMIN SUB-NAVIGATION */}
      <div className="portal-subnav">
        <div className="tab-pill-list">
          <button className={`tab-pill ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>
            <Icon name="overview" size={16} /> Campus Overview
          </button>
          <button className={`tab-pill ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
            <Icon name="users" size={16} /> Faculty & Students ({users.length})
          </button>
          <button className={`tab-pill ${tab === 'classrooms' ? 'active' : ''}`} onClick={() => setTab('classrooms')}>
            <Icon name="building" size={16} /> Lecture Halls & GPS ({classrooms.length})
          </button>
          <button className={`tab-pill ${tab === 'courses' ? 'active' : ''}`} onClick={() => setTab('courses')}>
            <Icon name="book" size={16} /> Courses & Subjects ({courses.length})
          </button>
          <button className={`tab-pill ${tab === 'enrollments' ? 'active' : ''}`} onClick={() => setTab('enrollments')}>
            <Icon name="list" size={16} /> Student Enrolments ({enrollments.length})
          </button>
        </div>
      </div>

      {/* 1. OVERVIEW */}
      {tab === 'overview' && (
        <div className="portal-content">
          <div className="dashboard-stats-grid">
            <div className="stat-card stat-blue">
              <div className="stat-icon-wrap"><Icon name="users" size={24} /></div>
              <div className="stat-data">
                <div className="stat-number">{dashboard?.students ?? 0}</div>
                <div className="stat-title">Enrolled Students</div>
              </div>
              <div className="stat-footer">Active student accounts</div>
            </div>

            <div className="stat-card stat-purple">
              <div className="stat-icon-wrap"><Icon name="shield" size={24} /></div>
              <div className="stat-data">
                <div className="stat-number">{dashboard?.teachers ?? 0}</div>
                <div className="stat-title">Faculty Members</div>
              </div>
              <div className="stat-footer">Lecturers & Professors</div>
            </div>

            <div className="stat-card stat-green">
              <div className="stat-icon-wrap"><Icon name="book" size={24} /></div>
              <div className="stat-data">
                <div className="stat-number">{dashboard?.courses ?? 0}</div>
                <div className="stat-title">Academic Courses</div>
              </div>
              <div className="stat-footer">Active this semester</div>
            </div>

            <div className="stat-card stat-amber">
              <div className="stat-icon-wrap"><Icon name="building" size={24} /></div>
              <div className="stat-data">
                <div className="stat-number">{dashboard?.classrooms ?? 0}</div>
                <div className="stat-title">Geofenced Halls</div>
              </div>
              <div className="stat-footer">Classrooms with GPS setup</div>
            </div>

            <div className="stat-card stat-indigo">
              <div className="stat-icon-wrap"><Icon name="qr" size={24} /></div>
              <div className="stat-data">
                <div className="stat-number">{dashboard?.sessions ?? 0}</div>
                <div className="stat-title">Total Sessions Held</div>
              </div>
              <div className="stat-footer">Recorded lectures</div>
            </div>
          </div>

          <div className="admin-quick-setup-card card">
            <div className="card-header-styled">
              <div>
                <span className="subhead-pill">CAMPUS SETUP WORKFLOW</span>
                <h2>Institution Setup & Provisioning Guide</h2>
                <p>Follow these 4 simple steps to onboard your academic semester:</p>
              </div>
            </div>

            <div className="workflow-steps-grid">
              <div className="workflow-card" onClick={() => setTab('users')}>
                <div className="step-badge">01</div>
                <div className="workflow-icon"><Icon name="users" size={22} /></div>
                <h3>1. Register Members</h3>
                <p>Create student accounts and faculty members with login credentials.</p>
                <span className="step-link">Go to User Directory →</span>
              </div>

              <div className="workflow-card" onClick={() => setTab('classrooms')}>
                <div className="step-badge">02</div>
                <div className="workflow-icon"><Icon name="location" size={22} /></div>
                <h3>2. Set Lecture Halls & GPS</h3>
                <p>Register room numbers and use the 1-click GPS fetch to set exact geofences.</p>
                <span className="step-link">Configure Lecture Halls →</span>
              </div>

              <div className="workflow-card" onClick={() => setTab('courses')}>
                <div className="step-badge">03</div>
                <div className="workflow-icon"><Icon name="book" size={22} /></div>
                <h3>3. Create Courses</h3>
                <p>Assign professors, classroom halls, and section numbers to subjects.</p>
                <span className="step-link">Create Subjects & Courses →</span>
              </div>

              <div className="workflow-card" onClick={() => setTab('enrollments')}>
                <div className="step-badge">04</div>
                <div className="workflow-icon"><Icon name="list" size={22} /></div>
                <h3>4. Enroll Students</h3>
                <p>Link students into their enrolled courses so they can scan into lectures.</p>
                <span className="step-link">Manage Student Rosters →</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. USERS MANAGEMENT */}
      {tab === 'users' && (
        <div className="portal-content two-col-layout">
          <div className="form-panel card">
            <div className="sub-tab-switcher">
              <button
                type="button"
                className={`sub-tab-btn ${userSubTab === 'single' ? 'active' : ''}`}
                onClick={() => setUserSubTab('single')}
              >
                👤 Single
              </button>
              <button
                type="button"
                className={`sub-tab-btn ${userSubTab === 'bulk' ? 'active' : ''}`}
                onClick={() => setUserSubTab('bulk')}
              >
                📁 Bulk CSV (100+)
              </button>
            </div>

            {userSubTab === 'single' ? (
              <>
                <div className="panel-header">
                  <span className="subhead-pill">USER PROVISIONING</span>
                  <h3>Register Member</h3>
                  <p>Add a single faculty member or student account.</p>
                </div>

                <form onSubmit={handleCreateUser} className="styled-form">
                  <div className="input-group">
                    <label>Full Name</label>
                    <input
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      placeholder="e.g. Dr. Robert Vance / Sarah Jenkins"
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label>Institutional Email</label>
                    <input
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      type="email"
                      placeholder="e.g. s.jenkins@university.edu"
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label>Default Password</label>
                    <input
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      type="password"
                      minLength={6}
                      placeholder="Minimum 6 characters"
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label>Account Role</label>
                    <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                      <option value="student">Student (Undergraduate / Postgraduate)</option>
                      <option value="teacher">Faculty Member / Professor</option>
                    </select>
                  </div>

                  <button type="submit" className="btn btn-primary btn-block">
                    <Icon name="plus" size={16} /> Register Member
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="panel-header">
                  <span className="subhead-pill">BATCH ONBOARDING</span>
                  <h3>Bulk CSV Student Import</h3>
                  <p>Import an entire class or semester batch of 100+ students instantly.</p>
                </div>

                <div className="bulk-template-bar">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleDownloadSampleCsv}>
                    <Icon name="download" size={14} /> Download Sample Template
                  </button>
                </div>

                <div className="styled-form">
                  <div className="input-group">
                    <label>Upload .CSV File</label>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleCsvFileUpload}
                      className="file-input-styled"
                    />
                  </div>

                  <div className="input-group">
                    <label>Default Password (if not in CSV)</label>
                    <input
                      value={bulkDefaultPassword}
                      onChange={(e) => setBulkDefaultPassword(e.target.value)}
                      placeholder="Student@123"
                    />
                  </div>

                  <div className="input-group">
                    <label>Auto-enroll into Course (Optional)</label>
                    <select value={bulkCourseId} onChange={(e) => setBulkCourseId(e.target.value)}>
                      <option value="">None (Don't auto-enroll)</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} — {c.name} ({c.section})
                        </option>
                      ))}
                    </select>
                  </div>

                  {bulkUsersPreview.length > 0 && (
                    <div className="bulk-preview-summary">
                      <strong>📋 {bulkUsersPreview.length} Records Parsed</strong>
                      <div className="mini-preview-list">
                        {bulkUsersPreview.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="preview-row">
                            <span>{item.name}</span>
                            <span className="id-sub">{item.email}</span>
                          </div>
                        ))}
                        {bulkUsersPreview.length > 3 && (
                          <div className="more-count">...and {bulkUsersPreview.length - 3} more students</div>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    onClick={handleExecuteBulkImport}
                    disabled={!bulkUsersPreview.length || bulkProcessing}
                  >
                    {bulkProcessing ? '⏳ Importing...' : `🚀 Import ${bulkUsersPreview.length} Students Now`}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="table-panel card">
            <div className="panel-header-with-search">
              <div>
                <span className="subhead-pill">DIRECTORY</span>
                <h3>Campus Directory ({users.length})</h3>
              </div>
              <div className="search-box">
                <Icon name="search" size={16} />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, or role..."
                />
              </div>
            </div>

            <div className="styled-table-wrapper">
              <table className="styled-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Email Address</th>
                    <th>Role</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="user-cell">
                          <div className={`mini-avatar avatar-${u.role}`}>{u.name.charAt(0).toUpperCase()}</div>
                          <div>
                            <strong>{u.name}</strong>
                            <div className="id-sub">ID #{u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`role-badge badge-${u.role}`}>{u.role}</span>
                      </td>
                      <td className="text-right">
                        {u.role !== 'admin' && (
                          <button className="btn-action-danger" onClick={() => handleDeleteUser(u.id, u.name)}>
                            <Icon name="trash" size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. CLASSROOMS & GPS */}
      {tab === 'classrooms' && (
        <div className="portal-content two-col-layout">
          <div className="form-panel card">
            <div className="panel-header">
              <span className="subhead-pill">PHYSICAL INFRASTRUCTURE</span>
              <h3>Add Lecture Hall</h3>
              <p>Configure room details and GPS geofencing perimeter.</p>
            </div>

            <form onSubmit={handleCreateClassroom} className="styled-form">
              <div className="input-group">
                <label>Building / Block</label>
                <input
                  value={roomForm.building}
                  onChange={(e) => setRoomForm({ ...roomForm, building: e.target.value })}
                  placeholder="e.g. Science & Engineering Block"
                  required
                />
              </div>

              <div className="row-2">
                <div className="input-group">
                  <label>Room Number</label>
                  <input
                    value={roomForm.room_number}
                    onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })}
                    placeholder="e.g. Hall 302"
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Floor</label>
                  <input
                    value={roomForm.floor}
                    onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })}
                    type="number"
                    required
                  />
                </div>
              </div>

              <div className="gps-config-box">
                <div className="gps-box-header">
                  <div>
                    <strong>Classroom Coordinates (GPS)</strong>
                    <div className="hint-text">Required for geofence validation</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleDetectCoordinates}
                    disabled={isGeoDetecting}
                  >
                    <Icon name="location" size={14} /> {isGeoDetecting ? 'Detecting...' : 'Fetch My Location'}
                  </button>
                </div>

                <div className="row-2">
                  <div className="input-group">
                    <label>Latitude</label>
                    <input
                      value={roomForm.latitude}
                      onChange={(e) => setRoomForm({ ...roomForm, latitude: e.target.value })}
                      type="number"
                      step="any"
                      placeholder="e.g. 19.0760"
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Longitude</label>
                    <input
                      value={roomForm.longitude}
                      onChange={(e) => setRoomForm({ ...roomForm, longitude: e.target.value })}
                      type="number"
                      step="any"
                      placeholder="e.g. 72.8777"
                      required
                    />
                  </div>
                </div>

                <div className="input-group" style={{ marginTop: '12px' }}>
                  <label>Geofence Radius: <strong>{roomForm.radius_m} meters</strong></label>
                  <div className="radius-presets">
                    <button
                      type="button"
                      className={`preset-btn ${roomForm.radius_m === '15' ? 'active' : ''}`}
                      onClick={() => setRoomForm({ ...roomForm, radius_m: '15' })}
                    >
                      Lab (15m)
                    </button>
                    <button
                      type="button"
                      className={`preset-btn ${roomForm.radius_m === '25' ? 'active' : ''}`}
                      onClick={() => setRoomForm({ ...roomForm, radius_m: '25' })}
                    >
                      Standard (25m)
                    </button>
                    <button
                      type="button"
                      className={`preset-btn ${roomForm.radius_m === '45' ? 'active' : ''}`}
                      onClick={() => setRoomForm({ ...roomForm, radius_m: '45' })}
                    >
                      Auditorium (45m)
                    </button>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                <Icon name="plus" size={16} /> Save Lecture Hall
              </button>
            </form>
          </div>

          <div className="table-panel card">
            <div className="panel-header">
              <span className="subhead-pill">CAMPUS HALLS</span>
              <h3>Configured Lecture Rooms ({classrooms.length})</h3>
            </div>

            <div className="styled-table-wrapper">
              <table className="styled-table">
                <thead>
                  <tr>
                    <th>Room & Building</th>
                    <th>Floor</th>
                    <th>GPS Coordinates</th>
                    <th>Radius</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {classrooms.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.room_number}</strong>
                        <div className="id-sub">{c.building}</div>
                      </td>
                      <td>Floor {c.floor}</td>
                      <td>
                        <span className="coordinate-pill">
                          <Icon name="location" size={12} /> {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}
                        </span>
                      </td>
                      <td>
                        <span className="radius-pill">{c.radius_m}m</span>
                      </td>
                      <td className="text-right">
                        <button className="btn-action-danger" onClick={() => handleDeleteClassroom(c.id, c.room_number)}>
                          <Icon name="trash" size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. COURSES */}
      {tab === 'courses' && (
        <div className="portal-content two-col-layout">
          <div className="form-panel card">
            <div className="panel-header">
              <span className="subhead-pill">ACADEMIC CURRICULUM</span>
              <h3>Create Course</h3>
              <p>Add subjects and assign faculty & lecture rooms.</p>
            </div>

            <form onSubmit={handleCreateCourse} className="styled-form">
              <div className="row-2">
                <div className="input-group">
                  <label>Course Code</label>
                  <input
                    value={courseForm.code}
                    onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                    placeholder="e.g. CS-301"
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Section / Batch</label>
                  <input
                    value={courseForm.section}
                    onChange={(e) => setCourseForm({ ...courseForm, section: e.target.value })}
                    placeholder="e.g. Sec A / Batch 2026"
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Course Name / Title</label>
                <input
                  value={courseForm.name}
                  onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                  placeholder="e.g. Distributed Systems & Cloud Computing"
                  required
                />
              </div>

              <div className="input-group">
                <label>Assigned Professor / Faculty</label>
                <select
                  value={courseForm.teacher_id}
                  onChange={(e) => setCourseForm({ ...courseForm, teacher_id: e.target.value })}
                  required
                >
                  <option value="" disabled>Select Faculty</option>
                  {teacherUsers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Assigned Lecture Hall</label>
                <select
                  value={courseForm.classroom_id}
                  onChange={(e) => setCourseForm({ ...courseForm, classroom_id: e.target.value })}
                  required
                >
                  <option value="" disabled>Select Lecture Hall</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.room_number} — {c.building} (Floor {c.floor})
                    </option>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={!teacherUsers.length || !classrooms.length}>
                <Icon name="plus" size={16} /> Create Course
              </button>
            </form>
          </div>

          <div className="table-panel card">
            <div className="panel-header">
              <span className="subhead-pill">COURSE CATALOG</span>
              <h3>Active Semester Courses ({courses.length})</h3>
            </div>

            <div className="styled-table-wrapper">
              <table className="styled-table">
                <thead>
                  <tr>
                    <th>Code & Section</th>
                    <th>Course Title</th>
                    <th>Faculty</th>
                    <th>Room</th>
                    <th>Enrolled</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((co) => (
                    <tr key={co.id}>
                      <td>
                        <strong>{co.code}</strong>
                        <div className="id-sub">{co.section}</div>
                      </td>
                      <td>{co.name}</td>
                      <td>
                        <span className="faculty-chip">{co.teacher}</span>
                      </td>
                      <td>{co.classroom}</td>
                      <td>
                        <span className="count-badge">{co.enrolled_count} Students</span>
                      </td>
                      <td className="text-right">
                        <button className="btn-action-danger" onClick={() => handleDeleteCourse(co.id, co.code)}>
                          <Icon name="trash" size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. ENROLLMENTS */}
      {tab === 'enrollments' && (
        <div className="portal-content two-col-layout">
          <div className="form-panel card">
            <div className="panel-header">
              <span className="subhead-pill">STUDENT ROSTER</span>
              <h3>Enroll Student</h3>
              <p>Assign a student into a registered academic subject.</p>
            </div>

            <form onSubmit={handleEnrollStudent} className="styled-form">
              <div className="input-group">
                <label>Select Course</label>
                <select
                  value={enrollForm.course_id}
                  onChange={(e) => setEnrollForm({ ...enrollForm, course_id: e.target.value })}
                  required
                >
                  <option value="" disabled>Select Course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name} ({c.section})
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Select Student</label>
                <select
                  value={enrollForm.student_id}
                  onChange={(e) => setEnrollForm({ ...enrollForm, student_id: e.target.value })}
                  required
                >
                  <option value="" disabled>Select Student</option>
                  {studentUsers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={!courses.length || !studentUsers.length}>
                <Icon name="plus" size={16} /> Enroll Student in Course
              </button>
            </form>
          </div>

          <div className="table-panel card">
            <div className="panel-header-with-search">
              <div>
                <span className="subhead-pill">ENROLLMENTS</span>
                <h3>Course Rosters ({enrollments.length})</h3>
              </div>
              <div className="filter-select-wrap">
                <select value={selectedCourseFilter} onChange={(e) => setSelectedCourseFilter(e.target.value)}>
                  <option value="all">All Courses</option>
                  {courses.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.code} ({c.section})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="styled-table-wrapper">
              <table className="styled-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Email</th>
                    <th>Course Code</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnrollments.map((en) => (
                    <tr key={en.id}>
                      <td>
                        <strong>{en.student_name}</strong>
                      </td>
                      <td>{en.student_email}</td>
                      <td>
                        <span className="course-code-pill">{en.course_code}</span>
                      </td>
                      <td className="text-right">
                        <button className="btn-action-danger" onClick={() => handleDeleteEnrollment(en.id)}>
                          <Icon name="trash" size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =========================================================================
// 2. COLLEGE FACULTY (TEACHER) PORTAL
// =========================================================================
function CollegeFacultyPortal(p) {
  const [secondsLeft, setSecondsLeft] = useState(25)
  const [searchStudent, setSearchStudent] = useState('')

  useEffect(() => {
    if (!p.session) return
    setSecondsLeft(25)
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 1 ? prev - 1 : 25))
    }, 1000)
    return () => clearInterval(interval)
  }, [p.session?.qr_token])

  const filteredEnrolled = p.enrolledStatus.filter((st) =>
    st.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
    st.email.toLowerCase().includes(searchStudent.toLowerCase())
  )

  const presentCount = p.enrolledStatus.filter((st) => st.status === 'present').length
  const totalCount = p.enrolledStatus.length
  const attendanceRate = totalCount ? Math.round((presentCount / totalCount) * 100) : 0

  return (
    <div className="faculty-portal-wrapper">
      {/* LAUNCH SESSION CARD */}
      <section className="card faculty-start-card">
        <div className="faculty-header-row">
          <div>
            <span className="subhead-pill">LECTURE CONTROL PANEL</span>
            <h2>Conduct Live Class Attendance</h2>
            <p>Select your assigned course to generate a dynamic rotating QR session on the projector.</p>
          </div>
        </div>

        <div className="faculty-form-grid">
          <div className="input-group">
            <label>Select Course / Lecture</label>
            <select value={p.courseId} onChange={(e) => p.setCourseId(e.target.value)}>
              {p.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name} ({c.section}) [Room {c.room}]
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Session Duration</label>
            <select value={p.minutes} onChange={(e) => p.setMinutes(e.target.value)}>
              <option value="5">5 Minutes (Quick Attendance)</option>
              <option value="10">10 Minutes (Standard)</option>
              <option value="15">15 Minutes</option>
              <option value="30">30 Minutes</option>
              <option value="60">60 Minutes (Full Lecture)</option>
            </select>
          </div>

          <div className="btn-align-end">
            <button className="btn btn-primary btn-lg" onClick={p.createSession} disabled={!p.courseId || p.session}>
              <Icon name="qr" size={18} /> Launch Projector QR Session →
            </button>
          </div>
        </div>
      </section>

      {/* ACTIVE LIVE SESSION */}
      {p.session && (
        <div className="live-session-split">
          {/* PROJECTOR QR DISPLAY */}
          <div className="card projector-qr-card">
            <div className="live-header">
              <span className="live-pulse-badge">
                <span className="live-dot"></span> LIVE LECTURE IN PROGRESS
              </span>
              <h3>Projector QR Code</h3>
              <p>Display this screen to students inside the lecture hall</p>
            </div>

            <div className="projector-qr-wrapper">
              <img
                src={`data:image/png;base64,${p.session.qr_png_base64}`}
                alt="Live Classroom QR"
                className="live-qr-image"
              />
              <div className="qr-timer-ring">
                <div className="timer-bar" style={{ width: `${(secondsLeft / 25) * 100}%` }}></div>
              </div>
            </div>

            <div className="qr-status-meta">
              <div className="countdown-text">
                <Icon name="clock" size={16} /> QR refreshes in: <strong>{secondsLeft}s</strong>
              </div>
              <div className="expiry-text">
                Session expires at {new Date(`${p.session.expires_at}Z`).toLocaleTimeString()}
              </div>
            </div>

            <button className="btn btn-danger btn-block" onClick={p.closeSession}>
              End Session & Send Defaulter Alerts
            </button>
          </div>

          {/* REAL-TIME ATTENDANCE ROSTER & OVERRIDES */}
          <div className="card live-roster-card">
            <div className="roster-header-styled">
              <div>
                <span className="subhead-pill">REAL-TIME ROSTER</span>
                <h3>Classroom Attendance</h3>
              </div>
              <div className="roster-metrics-badge">
                <strong>{presentCount} / {totalCount}</strong> Present ({attendanceRate}%)
              </div>
            </div>

            <div className="roster-search-bar">
              <Icon name="search" size={14} />
              <input
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                placeholder="Search student by name or email..."
              />
            </div>

            <div className="styled-table-wrapper" style={{ maxHeight: '380px', overflowY: 'auto' }}>
              <table className="styled-table compact">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Distance</th>
                    <th className="text-right">Manual Override</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnrolled.map((st) => (
                    <tr key={st.student_id}>
                      <td>
                        <strong>{st.name}</strong>
                        <div className="id-sub">{st.email}</div>
                      </td>
                      <td>
                        <span className={`status-tag status-${st.status}`}>{st.status}</span>
                      </td>
                      <td>
                        {st.distance_m != null ? (
                          <span className="dist-text">{st.distance_m}m</span>
                        ) : (
                          <span className="dist-text muted">—</span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="override-btn-group">
                          {st.status !== 'present' && (
                            <button
                              className="btn-mini btn-mini-success"
                              onClick={() => p.manualMark(st.student_id, 'present')}
                            >
                              Present
                            </button>
                          )}
                          {st.status !== 'late' && (
                            <button
                              className="btn-mini btn-mini-warning"
                              onClick={() => p.manualMark(st.student_id, 'late')}
                            >
                              Late
                            </button>
                          )}
                          {st.status !== 'absent' && (
                            <button
                              className="btn-mini btn-mini-danger"
                              onClick={() => p.manualMark(st.student_id, 'absent')}
                            >
                              Absent
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* COURSE REPORTS & ANALYTICS */}
      <section className="card faculty-reports-card">
        <div className="reports-header-styled">
          <div>
            <span className="subhead-pill">ACADEMIC AUDIT</span>
            <h2>Course Attendance Analytics & Defaulters</h2>
            <p>View semester percentages and download official university reports.</p>
          </div>

          <div className="reports-action-bar">
            <div className="threshold-pill-selector">
              <span>Defaulter Cutoff:</span>
              <select value={p.reportThreshold} onChange={(e) => p.setReportThreshold(e.target.value)}>
                <option value="60">60%</option>
                <option value="70">70%</option>
                <option value="75">75% (University Norm)</option>
                <option value="80">80%</option>
                <option value="85">85%</option>
              </select>
            </div>

            <button className="btn btn-primary" onClick={p.loadReport} disabled={!p.courseId}>
              Generate Report
            </button>
            <button className="btn btn-secondary" onClick={() => p.download('csv')}>
              <Icon name="download" size={14} /> CSV
            </button>
            <button className="btn btn-secondary" onClick={() => p.download('pdf')}>
              <Icon name="download" size={14} /> Official PDF
            </button>
          </div>
        </div>

        {p.report && (
          <div className="report-results-wrapper">
            <div className="report-course-banner">
              <strong>{p.report.course.code}</strong>: {p.report.course.name} ({p.report.course.section})
            </div>

            <div className="styled-table-wrapper">
              <table className="styled-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Institutional Email</th>
                    <th>Lectures Attended</th>
                    <th>Attendance %</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {p.report.students.map((s) => (
                    <tr key={s.student_id} className={s.is_defaulter ? 'defaulter-row' : ''}>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.email}</td>
                      <td>{s.present} / {s.total} Lectures</td>
                      <td>
                        <div className="pct-bar-wrapper">
                          <strong>{s.percentage}%</strong>
                          <div className="mini-pct-track">
                            <div
                              className={`mini-pct-fill ${s.is_defaulter ? 'fill-bad' : 'fill-good'}`}
                              style={{ width: `${Math.min(s.percentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-tag ${s.is_defaulter ? 'status-defaulter' : 'status-ok'}`}>
                          {s.is_defaulter ? '⚠️ Defaulter' : '✓ Good Standing'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

// =========================================================================
// 3. COLLEGE STUDENT COMPONENT
// =========================================================================
function CollegeStudentPortal(p) {
  return (
    <div className="student-portal-wrapper">
      {/* CHECK-IN CARD */}
      <section className="card student-checkin-card">
        <div className="checkin-header">
          <span className="subhead-pill">CAMPUS CHECK-IN STATION</span>
          <h2>Mark Classroom Attendance</h2>
          <p>Scan the rotating QR code projected by your professor while inside the lecture hall.</p>
        </div>

        <div className="scanner-action-zone">
          {p.scanning ? (
            <div className="camera-viewfinder-box">
              <video className="scanner-video" ref={p.videoRef} />
              <div className="scanner-overlay-grid">
                <div className="laser-scanner-line"></div>
              </div>
              <button className="btn btn-secondary btn-sm scanner-cancel" onClick={p.stopScanner}>
                ✕ Close Camera
              </button>
            </div>
          ) : (
            <div className="open-camera-hero" onClick={p.startScanner}>
              <div className="cam-icon-circle"><Icon name="camera" size={32} /></div>
              <h3>Tap to Launch Camera Scanner</h3>
              <p>Scan the dynamic QR on the lecture hall screen</p>
            </div>
          )}
        </div>

        <div className="qr-input-submit-row">
          <div className="input-group flex-1">
            <label>Scanned QR Token</label>
            <input
              value={p.qrToken}
              onChange={(e) => p.setQrToken(e.target.value)}
              placeholder="QR token automatically populates here upon scan..."
            />
          </div>

          <button className="btn btn-primary btn-lg" onClick={p.checkIn} disabled={!p.qrToken}>
            <Icon name="location" size={18} /> Verify Location & Check In
          </button>
        </div>
      </section>

      {/* STUDENT COURSES & NOTIFICATIONS */}
      <div className="student-dashboard-split">
        <div className="card student-courses-card">
          <div className="panel-header">
            <span className="subhead-pill">MY ACADEMICS</span>
            <h3>Enrolled Courses</h3>
          </div>

          <div className="course-cards-list">
            {p.studentData?.dashboard?.courses?.length ? (
              p.studentData.dashboard.courses.map((c) => {
                const isSafe = c.percentage >= 75
                return (
                  <div key={c.id} className="student-course-item">
                    <div className="course-item-header">
                      <div>
                        <strong>{c.code}</strong> — {c.name}
                        <div className="id-sub">Section: {c.section}</div>
                      </div>
                      <div className={`pct-bubble ${isSafe ? 'bubble-safe' : 'bubble-danger'}`}>
                        {c.percentage}%
                      </div>
                    </div>

                    <div className="course-progress-bar">
                      <div
                        className={`progress-fill ${isSafe ? 'bg-good' : 'bg-bad'}`}
                        style={{ width: `${Math.min(c.percentage, 100)}%` }}
                      ></div>
                    </div>

                    <div className="course-standing-row">
                      <span className={`standing-text ${isSafe ? 'text-good' : 'text-bad'}`}>
                        {isSafe ? '✓ Safe Standing (≥75%)' : '⚠️ Defaulter Risk (<75%)'}
                      </span>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="empty-state">No courses enrolled yet. Please contact your college admin.</div>
            )}
          </div>
        </div>

        <div className="card student-notifs-card">
          <div className="panel-header">
            <span className="subhead-pill">ALERTS & NOTICES</span>
            <h3>Campus Notifications</h3>
          </div>

          <div className="notif-list">
            {p.studentData?.notifications?.length ? (
              p.studentData.notifications.map((n) => (
                <div key={n.id} className="notif-item-card">
                  <div className="notif-icon"><Icon name="bell" size={16} /></div>
                  <div className="notif-body">
                    <p>{n.message}</p>
                    <span className="notif-time">{new Date(`${n.created_at}Z`).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No notifications. You are all caught up!</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App


