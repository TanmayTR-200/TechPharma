"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-new'
import { EditProfileDialog } from '@/components/edit-profile-dialog'

export default function SettingsPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push('/auth?mode=login')
    }
  }, [user, router])

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
      <div className="max-w-2xl">
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Account Information</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <p className="mt-1">{user?.name || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <p className="mt-1">{user?.email || 'Not set'}</p>
              </div>
            </div>
          </div>
          <div className="pt-4">
            <EditProfileDialog />
          </div>
        </div>
      </div>
    </div>
  )
}
