import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'

const ROLES = ['student', 'lecturer', 'dept_head', 'admin']
const LIFECYCLE_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED', 'ALUMNI', 'ARCHIVED']

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [schools, setSchools] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // 'edit' | 'suspend' | 'delete'
  const [selected, setSelected] = useState(null)

  // Edit Modal State
  const [newRole, setNewRole] = useState('')
  const [newIdNumber, setNewIdNumber] = useState('')
  const [newStatus, setNewStatus] = useState('ACTIVE')
  const [assignedSchool, setAssignedSchool] = useState('')
  const [assignedDept, setAssignedDept] = useState('')
  const [suspensionReason, setSuspensionReason] = useState('')
  const [hardDelete, setHardDelete] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [roleError, setRoleError] = useState('')

  async function loadData() {
    try {
      const [uRes, sRes] = await Promise.all([api.get('/users'), api.get('/schools')])
      setUsers(uRes.data?.users ?? [])
      setSchools(sRes.data?.schools ?? [])
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Fetch departments when school is selected in modal
  useEffect(() => {
    if (assignedSchool) {
      api.get(`/departments?schoolId=${assignedSchool}`)
        .then((r) => setDepartments(r.data?.departments ?? []))
        .catch(() => setDepartments([]))
    } else {
      setDepartments([])
    }
  }, [assignedSchool])

  function openEditModal(user) {
    setSelected(user)
    setNewRole(user.role)
    setNewIdNumber(user.idNumber || '')
    setNewStatus(user.status || 'ACTIVE')
    const schoolId = user.schoolId?._id || user.schoolId || ''
    setAssignedSchool(schoolId)
    setAssignedDept(user.departmentId?._id || user.departmentId || '')
    setModal('edit')
    setRoleError('')
    // Pre-fetch departments immediately if the user already has a school assigned
    if (schoolId) {
      api.get(`/departments?schoolId=${schoolId}`)
        .then((r) => setDepartments(r.data?.departments ?? []))
        .catch(() => setDepartments([]))
    } else {
      setDepartments([])
    }
  }

  function openSuspendModal(user) {
    setSelected(user)
    setSuspensionReason(user.suspensionReason || '')
    setModal('suspend')
  }

  function openDeleteModal(user) {
    setSelected(user)
    setHardDelete(false)
    setDeleteReason('')
    setModal('delete')
  }

  async function handleSave() {
    if (!selected || !newRole) return
    setSaving(true)
    setRoleError('')
    try {
      if (newRole !== selected.role) {
        await api.patch(`/users/${selected._id}/role`, { role: newRole })
      }
      if (newStatus !== selected.status) {
        await api.patch(`/users/${selected._id}/status`, { status: newStatus })
      }
      await api.patch(`/users/${selected._id}/assignment`, {
        schoolId: assignedSchool,
        departmentId: assignedDept,
        idNumber: newIdNumber,
      })
      setModal(null)
      loadData()
    } catch (err) {
      const msg = err.response?.data?.error ?? err.message ?? 'Failed to update user.'
      setRoleError(msg)
    }
    setSaving(false)
  }

  async function handleSuspendToggle() {
    if (!selected) return
    setSaving(true)
    try {
      const targetStatus = selected.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED'
      await api.patch(`/users/${selected._id}/status`, {
        status: targetStatus,
        reason: suspensionReason,
      })
      setModal(null)
      loadData()
    } catch (err) {
      alert(err.response?.data?.error ?? 'Failed to update suspension status.')
    }
    setSaving(false)
  }

  async function handleDeleteUser() {
    if (!selected) return
    if (hardDelete && !deleteReason.trim()) {
      alert('A typed reason is required for permanent hard deletion.')
      return
    }

    setSaving(true)
    try {
      // BUG-24 fix: pass reason in body, not as a query param
      const url = hardDelete ? `/users/${selected._id}?hard=true` : `/users/${selected._id}`
      await api.delete(url, hardDelete ? { data: { reason: deleteReason } } : undefined)
      setModal(null)
      loadData()
    } catch (err) {
      alert(err.response?.data?.error ?? 'Failed to delete user.')
    }
    setSaving(false)
  }

  const filtered = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.idNumber?.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const ROLE_COLORS = {
    student: 'bg-[#d8e2ff] text-[#001a41]',
    lecturer: 'bg-[#a0f3d4] text-[#002117]',
    dept_head: 'bg-[#ffdcbb] text-[#2b1700]',
    admin: 'bg-[#03224d] text-white',
  }

  const LIFECYCLE_BADGES = {
    PENDING: 'bg-[#ffdcbb] text-[#543100] border-[#dd9235]',
    ACTIVE: 'bg-[#a0f3d4] text-[#00513e] border-[#086b53]',
    SUSPENDED: 'bg-[#ffdad6] text-[#93000a] border-[#ba1a1a]',
    ALUMNI: 'bg-[#d8e2ff] text-[#001a41] border-[#1f3864]',
    ARCHIVED: 'bg-[#f0eded] text-[#747780] border-[#c4c6d0]',
  }

  const columns = [
    { key: 'fullName', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'idNumber', label: 'Matric / Staff ID', render: (v) => v || '—' },
    {
      key: 'role',
      label: 'Role',
      render: (v) => (
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${ROLE_COLORS[v] ?? ''}`}>
          {v?.replace('_', ' ').toUpperCase()}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Lifecycle Status',
      render: (v) => (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${LIFECYCLE_BADGES[v] ?? 'bg-[#f0eded] text-[#44474f]'}`}>
          {v || 'ACTIVE'}
        </span>
      ),
    },
    { key: 'schoolId', label: 'School', render: (v) => v?.name ?? 'Unassigned' },
    { key: 'departmentId', label: 'Department', render: (v) => v?.name ?? 'Unassigned' },
  ]

  return (
    <AppLayout role="admin">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[32px] font-semibold text-[#03224d]">User Lifecycle Management</h2>
          <p className="text-[14px] text-[#44474f]">{users.length} registered accounts across all lifecycle stages</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/admin/bulk-import"
            className="px-4 py-2 bg-[#086b53] text-white text-[13px] font-bold rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer shrink-0 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">group_add</span>
            Bulk Registrar PIN Import
          </Link>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-[#c4c6d0] rounded-lg text-[13px] bg-white font-medium focus:outline-none focus:border-[#03224d]"
          >
            <option value="ALL">All Statuses ({users.length})</option>
            <option value="PENDING">Pending ({users.filter(u => u.status === 'PENDING').length})</option>
            <option value="ACTIVE">Active ({users.filter(u => u.status === 'ACTIVE').length})</option>
            <option value="SUSPENDED">Suspended ({users.filter(u => u.status === 'SUSPENDED').length})</option>
            <option value="ALUMNI">Alumni ({users.filter(u => u.status === 'ALUMNI').length})</option>
            <option value="ARCHIVED">Archived ({users.filter(u => u.status === 'ARCHIVED').length})</option>
          </select>

          <div className="relative w-full sm:w-auto">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#44474f]">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, ID..."
              className="pl-9 pr-4 py-2 border border-[#c4c6d0] rounded-lg text-[13px] focus:outline-none focus:border-[#03224d] w-full sm:w-60"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#c4c6d0] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <LoadingSkeleton type="table" count={8} />
        ) : (
          <DataTable
            columns={columns}
            rows={filtered}
            emptyMessage="No user accounts match your criteria."
            actions={(row) => (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => openEditModal(row)}
                  className="flex items-center gap-1 text-[12px] font-bold text-[#03224d] hover:underline cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
                  Edit
                </button>

                <button
                  onClick={() => openSuspendModal(row)}
                  className={`flex items-center gap-1 text-[12px] font-bold cursor-pointer hover:underline ${
                    row.status === 'SUSPENDED' ? 'text-[#086b53]' : 'text-[#dd9235]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {row.status === 'SUSPENDED' ? 'check_circle' : 'block'}
                  </span>
                  {row.status === 'SUSPENDED' ? 'Reinstate' : 'Suspend'}
                </button>

                <button
                  onClick={() => openDeleteModal(row)}
                  className="flex items-center gap-1 text-[12px] font-bold text-[#ba1a1a] hover:underline cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Delete
                </button>
              </div>
            )}
          />
        )}
      </div>

      {/* Edit User Modal */}
      {modal === 'edit' && selected && (
        <Modal title="Manage User Lifecycle & Assignment" onClose={() => setModal(null)} size="md">
          <div className="space-y-4">
            <div className="p-4 bg-[#f6f3f2] rounded-lg flex items-center justify-between">
              <div>
                <p className="text-[14px] font-bold">{selected.fullName}</p>
                <p className="text-[12px] text-[#44474f]">{selected.email}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${ROLE_COLORS[selected.role]}`}>
                {selected.role?.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            {/* Matric / Staff ID */}
            <div>
              <label htmlFor="idNumber" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                Matriculation / Staff ID Number
              </label>
              <input
                id="idNumber"
                type="text"
                value={newIdNumber}
                onChange={(e) => setNewIdNumber(e.target.value)}
                placeholder="e.g. NJU/2024/0142 or STF/CS/08"
                className="w-full border border-[#c4c6d0] rounded-md px-3 py-2 text-[14px] focus:outline-none focus:border-[#03224d]"
              />
            </div>

            {/* Lifecycle Status */}
            <div>
              <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-2">Lifecycle Status</label>
              <div className="grid grid-cols-3 gap-2">
                {LIFECYCLE_STATUSES.map((st) => (
                  <label
                    key={st}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      newStatus === st ? 'border-[#03224d] bg-[#f6f3f2]' : 'border-[#c4c6d0] hover:bg-[#f6f3f2]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={st}
                      checked={newStatus === st}
                      onChange={() => setNewStatus(st)}
                      className="text-[#03224d]"
                    />
                    <span className="text-[12px] font-bold capitalize">{st}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Assign Role */}
            <div>
              <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-2">Assign Role</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <label
                    key={r}
                    className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                      newRole === r ? 'border-[#03224d] bg-[#f6f3f2]' : 'border-[#c4c6d0] hover:bg-[#f6f3f2]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r}
                      checked={newRole === r}
                      onChange={() => setNewRole(r)}
                      className="text-[#03224d]"
                    />
                    <span className="text-[12px] font-medium capitalize">{r.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* School & Department */}
            <div className="space-y-3 pt-2 border-t border-[#c4c6d0]/50">
              <div>
                <label htmlFor="school" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                  Assign School
                </label>
                <select
                  id="school"
                  value={assignedSchool}
                  onChange={(e) => {
                    setAssignedSchool(e.target.value)
                    setAssignedDept('')
                  }}
                  className="w-full border border-[#c4c6d0] rounded-md px-3 py-2 text-[14px] focus:outline-none focus:border-[#03224d]"
                >
                  <option value="">Unassigned (None)</option>
                  {schools.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="dept" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                  Assign Department
                </label>
                <select
                  id="dept"
                  disabled={!assignedSchool}
                  value={assignedDept}
                  onChange={(e) => setAssignedDept(e.target.value)}
                  className="w-full border border-[#c4c6d0] rounded-md px-3 py-2 text-[14px] focus:outline-none focus:border-[#03224d] disabled:opacity-50"
                >
                  <option value="">Unassigned (None)</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {roleError && <p className="text-[14px] text-[#ba1a1a] font-medium">{roleError}</p>}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#03224d] text-white px-5 py-2.5 rounded text-[14px] font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                onClick={() => setModal(null)}
                className="px-5 py-2.5 border border-[#c4c6d0] text-[#44474f] rounded text-[14px] font-bold hover:bg-[#f0eded] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Suspend / Reinstate Modal */}
      {modal === 'suspend' && selected && (
        <Modal
          title={selected.status === 'SUSPENDED' ? 'Reinstate User Account' : 'Suspend User Account'}
          onClose={() => setModal(null)}
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-[14px] text-[#44474f]">
              {selected.status === 'SUSPENDED'
                ? `Reinstate ${selected.fullName} (${selected.email}) to ACTIVE status?`
                : `Suspending ${selected.fullName} will grant read-only access (viewing content, but no course submissions or edits).`}
            </p>

            {selected.status !== 'SUSPENDED' && (
              <div>
                <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                  Suspension Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pending academic review..."
                  value={suspensionReason}
                  onChange={e => setSuspensionReason(e.target.value)}
                  className="w-full border border-[#c4c6d0] rounded-md px-3 py-2 text-[14px] focus:outline-none focus:border-[#03224d]"
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSuspendToggle}
                disabled={saving}
                className={`${selected.status === 'SUSPENDED' ? 'bg-[#086b53]' : 'bg-[#ba1a1a]'} text-white px-5 py-2.5 rounded text-[14px] font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer`}
              >
                {saving ? 'Processing…' : selected.status === 'SUSPENDED' ? 'Reinstate Account' : 'Confirm Suspension'}
              </button>
              <button
                onClick={() => setModal(null)}
                className="px-5 py-2.5 border border-[#c4c6d0] text-[#44474f] rounded text-[14px] font-bold hover:bg-[#f0eded] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete User Modal */}
      {modal === 'delete' && selected && (
        <Modal title="Delete User Account" onClose={() => setModal(null)} size="sm">
          <div className="space-y-4">
            <p className="text-[14px] text-[#44474f]">
              Are you sure you want to remove account <strong>{selected.fullName}</strong> ({selected.email})?
            </p>

            <div className="space-y-2 border-t border-b border-[#c4c6d0]/50 py-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="deleteType"
                  checked={!hardDelete}
                  onChange={() => setHardDelete(false)}
                  className="text-[#03224d]"
                />
                <span className="text-[13px] font-bold text-[#03224d]">Soft Delete (Recommended)</span>
              </label>
              <p className="text-[11px] text-[#44474f] pl-6">
                Hides account from active listings while preserving historical grades, assignments, and audit trails.
              </p>

              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="radio"
                  name="deleteType"
                  checked={hardDelete}
                  onChange={() => setHardDelete(true)}
                  className="text-[#ba1a1a]"
                />
                <span className="text-[13px] font-bold text-[#ba1a1a]">Permanent Hard Delete</span>
              </label>
              <p className="text-[11px] text-[#44474f] pl-6">
                Permanently purges the user document from the database (reserved for duplicate accounts).
              </p>
            </div>

            {hardDelete && (
              <div>
                <label className="block text-[12px] font-bold text-[#ba1a1a] uppercase tracking-wider mb-1">
                  Typed Reason for Permanent Deletion *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Duplicate account created in error"
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  className="w-full border border-[#ba1a1a] rounded-md px-3 py-2 text-[14px] focus:outline-none"
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleDeleteUser}
                disabled={saving}
                className="bg-[#ba1a1a] text-white px-5 py-2.5 rounded text-[14px] font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Deleting…' : hardDelete ? 'Permanently Delete' : 'Soft Delete'}
              </button>
              <button
                onClick={() => setModal(null)}
                className="px-5 py-2.5 border border-[#c4c6d0] text-[#44474f] rounded text-[14px] font-bold hover:bg-[#f0eded] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  )
}
