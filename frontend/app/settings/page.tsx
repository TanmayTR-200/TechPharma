'use client'

import { useState, useEffect } from 'react'
import { User, Store, Bell, Shield, Trash2, AlertTriangle, Loader2, MapPin, Plus, Check } from 'lucide-react'
import { EditProfileDialog } from '@/components/edit-profile-dialog'
import { useAuth } from '@/contexts/auth'
import { useToast } from '@/hooks/use-toast'
import { API_ENDPOINTS, fetcher } from '@/lib/api-config'
import { Button } from '@/components/ui/button'
import { INDIAN_STATES, INDIAN_CITIES } from '@/lib/locations'

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'store', label: 'Store', icon: Store },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
]

export default function SettingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('profile')
  const [editOpen, setEditOpen] = useState(false)

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteOtpSent, setDeleteOtpSent] = useState(false)
  const [deleteOtp, setDeleteOtp] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: 'Error', description: 'Please fill in all password fields.', variant: 'destructive' })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'New passwords do not match.', variant: 'destructive' })
      return
    }
    if (newPassword.length < 8) {
      toast({ title: 'Error', description: 'New password must be at least 8 characters.', variant: 'destructive' })
      return
    }

    setUpdatingPassword(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword })
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: 'Password updated successfully.' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        throw new Error(data.message)
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update password.', variant: 'destructive' })
    } finally {
      setUpdatingPassword(false)
    }
  }

  const handleSendDeleteOtp = async () => {
    if (!user?.email) return
    setSendingOtp(true)
    try {
      const res = await fetch(`${API_URL}/api/auth/send-delete-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      })
      const data = await res.json()
      if (data.success) {
        setDeleteOtpSent(true)
        toast({ title: 'OTP Sent', description: 'Check your email for the deletion code.' })
      } else {
        throw new Error(data.message)
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setSendingOtp(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user?.email || !deleteOtp) return
    setDeleting(true)
    try {
      const res = await fetch(`${API_URL}/api/auth/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, otp: deleteOtp })
      })
      const data = await res.json()
      if (data.success) {
        localStorage.removeItem('token')
        toast({ title: 'Account Deleted', description: 'Your account has been permanently deleted.' })
        setTimeout(() => { window.location.href = '/' }, 1500)
      } else {
        throw new Error(data.message)
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="w-full space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
          <p className="mt-1 text-muted-foreground">Manage your account and preferences</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
          {/* Tabs */}
          <aside>
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
            <button
              onClick={() => setEditOpen(true)}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Edit Profile
            </button>
          </aside>

          {/* Content */}
          <div className="rounded-lg border border-border bg-card p-6">
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-foreground">Profile information</h2>
                  <button
                    onClick={() => setEditOpen(true)}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary/30"
                  >
                    Edit
                  </button>
                </div>
                <div className="flex items-center gap-4 border-b border-border pb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-xl font-bold text-muted-foreground">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-base font-medium text-foreground">{user?.name || 'User'}</p>
                    <p className="text-sm text-muted-foreground">{user?.email || 'No email'}</p>
                  </div>
                </div>

                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Full name</dt>
                    <dd className="mt-1 text-sm font-medium text-foreground">{user?.name || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Email</dt>
                    <dd className="mt-1 text-sm font-medium text-foreground">{user?.email || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Phone</dt>
                    <dd className="mt-1 text-sm font-medium text-foreground">{user?.phone || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">State</dt>
                    <dd className="mt-1 text-sm font-medium text-foreground">{user?.state || '-'}</dd>
                  </div>
                </dl>
              </div>
            )}

            {activeTab === 'store' && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-foreground">Store settings</h2>
                <p className="text-sm text-muted-foreground">Configure your store details and preferences.</p>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Store name</label>
                    <input
                      type="text"
                      defaultValue={user?.company?.name || ''}
                      placeholder="Your store name"
                      className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Store address</label>
                    <textarea
                      rows={3}
                      defaultValue={user?.company?.address || ''}
                      placeholder="Enter your store address"
                      className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
                    Save changes
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'addresses' && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-foreground">Saved addresses</h2>
                <SavedAddressesManager />
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-foreground">Notification preferences</h2>
                <div className="space-y-3">
                  {[
                    { label: 'New orders', desc: 'Get notified when you receive a new order' },
                    { label: 'Low stock alerts', desc: 'Get notified when product stock is low' },
                    { label: 'Messages', desc: 'Get notified when you receive a new message' },
                    { label: 'Weekly summary', desc: 'Receive a weekly sales summary' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input type="checkbox" defaultChecked className="peer sr-only" />
                        <div className="peer h-5 w-9 rounded-full bg-slate-200 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-card after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-4" />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-foreground">Security</h2>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Current password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">New password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Confirm new password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <button
                    onClick={handleChangePassword}
                    disabled={updatingPassword}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    {updatingPassword ? 'Updating...' : 'Update password'}
                  </button>
                </div>

                {/* Delete Account */}
                <div className="mt-8 border-t border-border pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>

                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-2 rounded-lg border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/5"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Profile
                    </button>
                  ) : (
                    <div className="space-y-3 rounded-lg border border-destructive/30 p-4 bg-destructive/5">
                      <p className="text-sm font-medium text-foreground">
                        Confirm deletion for <span className="text-destructive">{user?.email}</span>
                      </p>

                      {!deleteOtpSent ? (
                        <button
                          onClick={handleSendDeleteOtp}
                          disabled={sendingOtp}
                          className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-50"
                        >
                          {sendingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          Send OTP to {user?.email}
                        </button>
                      ) : (
                        <>
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Enter OTP</label>
                            <input
                              type="text"
                              value={deleteOtp}
                              onChange={(e) => setDeleteOtp(e.target.value)}
                              placeholder="6-digit code"
                              maxLength={6}
                              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleDeleteAccount}
                              disabled={deleting || !deleteOtp}
                              className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-50"
                            >
                              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              Confirm Delete
                            </button>
                            <button
                              onClick={() => { setShowDeleteConfirm(false); setDeleteOtpSent(false); setDeleteOtp('') }}
                              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <EditProfileDialog externalOpen={editOpen} onExternalOpenChange={setEditOpen} />
    </>
  )
}

const ADDRESS_LABELS = ['Home', 'Work', 'Other']

interface SavedAddress {
  _id: string
  label: string
  name: string
  phone: string
  line1: string
  city: string
  state: string
  pincode: string
}

function SavedAddressesManager() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ label: 'Home', name: '', phone: '', line1: '', city: '', state: '', pincode: '' })

  useEffect(() => { fetchAddresses() }, [])

  const fetchAddresses = async () => {
    try {
      const data = await fetcher(API_ENDPOINTS.addresses.list)
      if (data.addresses) setAddresses(data.addresses)
    } catch (e) { /* ignore */ }
  }

  const handleSave = async () => {
    if (!form.name || !form.line1 || !form.city || !form.pincode) {
      toast({ title: 'Missing fields', description: 'Please fill all required fields.', variant: 'destructive' })
      return
    }
    try {
      if (editingId) {
        await fetcher(API_ENDPOINTS.addresses.update(editingId), { method: 'PUT', body: JSON.stringify(form) })
        toast({ title: 'Address updated' })
      } else {
        const data = await fetcher(API_ENDPOINTS.addresses.create, { method: 'POST', body: JSON.stringify(form) })
        if (data.address) setAddresses(prev => [...prev, data.address])
        toast({ title: 'Address saved' })
      }
      setShowForm(false)
      setEditingId(null)
      setForm({ label: 'Home', name: user?.name || '', phone: user?.phone || '', line1: '', city: '', state: '', pincode: '' })
      fetchAddresses()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to save address', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetcher(API_ENDPOINTS.addresses.delete(id), { method: 'DELETE' })
      setAddresses(prev => prev.filter(a => a._id !== id))
      toast({ title: 'Address deleted' })
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to delete address', variant: 'destructive' })
    }
  }

  const startEdit = (addr: SavedAddress) => {
    setEditingId(addr._id)
    setForm({ label: addr.label, name: addr.name, phone: addr.phone, line1: addr.line1, city: addr.city, state: addr.state, pincode: addr.pincode })
    setShowForm(true)
  }

  return (
    <div className="space-y-3">
      {!showForm && (
        <button onClick={() => { setEditingId(null); setForm({ label: 'Home', name: user?.name || '', phone: user?.phone || '', line1: '', city: '', state: '', pincode: '' }); setShowForm(true) }} className="flex items-center gap-2 text-sm text-primary hover:underline">
          <Plus className="h-4 w-4" /> Add new address
        </button>
      )}

      {/* Saved addresses */}
      {addresses.map(addr => (
        <div key={addr._id} className="border border-border p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium bg-secondary text-foreground px-2 py-0.5 rounded">{addr.label}</span>
                <p className="text-sm font-medium text-foreground">{addr.name}</p>
              </div>
              <p className="text-sm text-muted-foreground">{addr.line1}, {addr.city}, {addr.state} - {addr.pincode}</p>
              {addr.phone && <p className="text-xs text-muted-foreground mt-1">Phone: {addr.phone}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(addr)} className="text-xs text-primary hover:underline">Edit</button>
              <button onClick={() => handleDelete(addr._id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Form */}
      {showForm && (
        <div className="border border-border p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Save as</label>
            <div className="flex flex-wrap gap-2 items-center">
              {ADDRESS_LABELS.map(l => (
                <button key={l} type="button" onClick={() => setForm({ ...form, label: l })} className={'px-4 py-1.5 text-xs font-medium rounded-md border transition-colors ' + (form.label === l ? 'border-foreground bg-foreground text-background' : 'border-border text-foreground hover:border-foreground/40')}>
                  {l}
                </button>
              ))}
              <input
                type="text"
                value={!ADDRESS_LABELS.includes(form.label) ? form.label : ''}
                onChange={e => setForm({ ...form, label: e.target.value })}
                placeholder="Custom label..."
                className="flex-1 min-w-[120px] border border-border bg-transparent px-3 py-1.5 text-xs text-foreground focus:border-foreground focus:outline-none rounded-md"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Full name *</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
              <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Address line *</label>
            <input type="text" value={form.line1} onChange={e => setForm({ ...form, line1: e.target.value })} placeholder="House no, street, area" className="w-full border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">State</label>
              <select
                value={form.state}
                onChange={e => setForm({ ...form, state: e.target.value, city: '' })}
                className="w-full border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">City *</label>
              <select
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
                disabled={!form.state}
                className="w-full border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none disabled:opacity-40"
              >
                <option value="">{form.state ? 'Select city' : 'Select state first'}</option>
                {(INDIAN_CITIES[form.state] || []).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Pincode *</label>
              <input type="text" value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} className="w-full border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => { setShowForm(false); setEditingId(null) }}>Cancel</Button>
            <Button type="button" size="sm" className="text-xs" onClick={handleSave}>{editingId ? 'Update' : 'Save'} address</Button>
          </div>
        </div>
      )}

      {addresses.length === 0 && !showForm && (
        <div className="text-center py-8">
          <MapPin className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No saved addresses yet</p>
        </div>
      )}
    </div>
  )
}