'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageSquare, Search } from 'lucide-react'
import DashboardLayout from '@/components/dashboard-layout'
import { API_ENDPOINTS, fetcher } from '@/lib/api-config'

interface Conversation {
  _id: string
  name?: string
  participant?: { name: string }
  lastMessage?: string
  lastMessageTime?: string
  senderName?: string
  receiverName?: string
  unreadCount?: number
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchConversations() {
      try {
        const data = await fetcher(API_ENDPOINTS.messages.conversations)
        setConversations(data.conversations || [])
      } catch (err) {
        // Use empty state
      } finally {
        setLoading(false)
      }
    }
    fetchConversations()
  }, [])

  const filtered = conversations.filter((c) => {
    const name = c.senderName || c.receiverName || c.participant?.name || ''
    return !search || name.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <DashboardLayout>
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="mt-1 text-muted-foreground">Chat with buyers and suppliers</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Conversations list */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-secondary" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center mx-auto" style={{ maxWidth: 512 }}>
            <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <h3 className="mt-4 text-base font-medium text-foreground">No conversations</h3>
            <p className="mt-1 text-sm text-muted-foreground">Messages from buyers and suppliers will appear here.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {filtered.map((conv) => {
              const name = conv.senderName || conv.receiverName || conv.participant?.name || 'Unknown'
              return (
                <Link
                  key={conv._id}
                  href={`/messages/${conv._id}`}
                  className="flex items-center gap-3 border-b border-border p-4 last:border-0 hover:bg-secondary/30"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-bold text-muted-foreground">
                    {name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{name}</p>
                      {conv.lastMessageTime && !isNaN(new Date(conv.lastMessageTime).getTime()) && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(conv.lastMessageTime).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {conv.lastMessage || 'No messages yet'}
                    </p>
                  </div>
                  {conv.unreadCount && conv.unreadCount > 0 && (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
