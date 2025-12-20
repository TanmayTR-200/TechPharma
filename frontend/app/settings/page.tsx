"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth'
import { EditProfileDialog } from '@/components/edit-profile-dialog'

import { formatDateShort } from '@/lib/formatDate'

export default function SettingsPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push('/auth?mode=login')
    }
  }, [user, router])

  // Force rerender when user data changes
  const [, forceUpdate] = useState({});
  useEffect(() => {
    const handleUserUpdate = () => forceUpdate({});
    window.addEventListener('userUpdated', handleUserUpdate);
    return () => window.removeEventListener('userUpdated', handleUserUpdate);
  }, []);

  return (
    <div className="min-h-screen p-8 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-zinc-900">Profile Settings</h1>
          </div>
          <div className="flex justify-end">
            <EditProfileDialog />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Profile Overview Card */}
          <div className="col-span-1 bg-zinc-900 rounded-lg shadow-lg p-6 border border-zinc-700">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-32 h-32 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                {user?.company?.logo ? (
                  <img 
                    src={user.company.logo} 
                    alt="Company Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-4xl font-bold text-white">
                    {user?.company?.name?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <h2 className="text-xl font-semibold text-white">{user?.name}</h2>
              <p className="text-zinc-300">{user?.company?.name || 'Company not set'}</p>
            </div>
          </div>

          {/* Account Details Card */}
          <div className="col-span-2 space-y-8">
            <div className="bg-zinc-900 rounded-lg shadow-lg p-6 border border-zinc-700 space-y-6">
              <h2 className="text-xl font-semibold text-white border-b border-zinc-700 pb-2">Account Information</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-zinc-300">Full Name</label>
                  <p className="mt-1 text-lg text-white">{user?.name || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-300">Email Address</label>
                  <p className="mt-1 text-lg text-white">{user?.email || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-300">Phone Number</label>
                  <p className="mt-1 text-lg text-white">{user?.phone || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-300">Account Created On</label>
                  <p className="mt-1 text-lg text-white">
                    {user?.createdAt ? (
                      formatDateShort(user.createdAt)
                    ) : user?._id ? (
                      formatDateShort(new Date(parseInt(user._id)).toISOString())
                    ) : (
                      'Not available'
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 rounded-lg shadow-lg p-6 border border-zinc-700 space-y-6">
              <h2 className="text-xl font-semibold text-white border-b border-zinc-700 pb-2">Company Information</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-zinc-300">Company Name</label>
                  <p className="mt-1 text-lg text-white">{user?.company?.name || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-300">Website</label>
                  <p className="mt-1 text-lg">
                    {user?.company?.website ? (
                      <a href={user.company.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline">
                        {user.company.website}
                      </a>
                    ) : (
                      <span className="text-white">Not set</span>
                    )}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-zinc-300">Company Description</label>
                  <p className="mt-1 text-lg text-white">{user?.company?.description || 'No description available'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-zinc-300">Business Address</label>
                  <p className="mt-1 text-lg text-white">{user?.company?.address || 'Not set'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
