'use client'

import { useState } from 'react'
import { User, Store, Bell, Shield, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { EditProfileDialog } from '@/components/edit-profile-dialog'
import { useAuth } from '@/contexts/auth'
import { useToast } from '@/hooks/use-toast'

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
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

      <EditProfileDialog />
    </>
  )
}