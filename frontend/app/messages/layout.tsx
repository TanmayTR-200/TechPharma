"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth'
import { Mail, Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { API_ENDPOINTS, fetcher } from '@/lib/api-config'
import { formatDateShort } from '@/lib/formatDate'
import DashboardLayout from '@/components/dashboard-layout'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Conversation {
  _id: string
  sender: string
  receiver: string
  lastMessage: string
  lastMessageTime: string
  senderName: string
  receiverName: string
  unreadCount?: number
}

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const pathname = usePathname()
  const router = useRouter()
  
  // Filter conversations based on search term (defensive: names may be missing)
  const searchLower = searchTerm.trim().toLowerCase()
  const filteredConversations = conversations.filter(conv => {
    if (!searchLower) return true
    const s = (conv.senderName || '').toLowerCase()
    const r = (conv.receiverName || '').toLowerCase()
    return s.includes(searchLower) || r.includes(searchLower)
  })

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token || !user) {
          // Ensure we clear the loading state when auth info isn't available so the UI
          // doesn't stay stuck in a loading state after a refresh.
          setLoading(false)
          return
        }

        const response = await fetcher(`${API_ENDPOINTS.messages.conversations}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        // Check if there's a conversation ID in the URL
        const pathParts = pathname.split('/')
        const currentConvId = pathParts[pathParts.length - 1]

        let updatedConversations = response.conversations || []

        // If the conversations endpoint responded with no data, fall back to
        // fetching raw messages for the user and synthesizing conversation
        // entries. This helps when the conversations endpoint is empty or not
        // populated after a refresh on some backends.
        if ((!updatedConversations || updatedConversations.length === 0) && user && user._id) {
          try {
            const fallback = await fetcher(API_ENDPOINTS.messages.list(user._id), {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });

            if (fallback && Array.isArray(fallback.messages) && fallback.messages.length > 0) {
              // Aggregate messages by conversation partner
              const convoMap: Record<string, any> = {}
              for (const m of fallback.messages) {
                const otherId = m.senderId === user._id ? m.receiverId : m.senderId
                const otherName = m.senderId === user._id ? m.receiverName : m.senderName
                if (!convoMap[otherId]) {
                  convoMap[otherId] = {
                    _id: otherId,
                    sender: user._id,
                    receiver: otherId,
                    lastMessage: m.content,
                    lastMessageTime: m.timestamp || m.createdAt || new Date().toISOString(),
                    senderName: user.name,
                    receiverName: otherName,
                    unreadCount: 0
                  }
                } else {
                  // update last message if this message is newer
                  const existing = convoMap[otherId]
                  const existingTime = new Date(existing.lastMessageTime).getTime()
                  const msgTime = new Date(m.timestamp || m.createdAt || Date.now()).getTime()
                  if (msgTime > existingTime) {
                    convoMap[otherId].lastMessage = m.content
                    convoMap[otherId].lastMessageTime = m.timestamp || m.createdAt
                  }
                }
              }

              updatedConversations = Object.values(convoMap).sort((a: any, b: any) => {
                return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
              })
            }
          } catch (err) {
            console.warn('Fallback messages list failed:', err)
          }
        }

        // If we're in a new conversation that's not in the list, fetch the user info and add it
  if (currentConvId && !updatedConversations.find((c: Conversation) => c._id === currentConvId)) {
          try {
            const userResponse = await fetcher(API_ENDPOINTS.users.get(currentConvId), {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            })
            
            if (userResponse.user) {
              updatedConversations = [{
                _id: currentConvId,
                sender: user._id,
                receiver: currentConvId,
                lastMessage: 'New conversation',
                lastMessageTime: new Date().toISOString(),
                senderName: user.name,
                receiverName: userResponse.user.name,
                unreadCount: 0
              }, ...updatedConversations]
            }
          } catch (error) {
            console.error('Error fetching user for new conversation:', error)
          }
        }

        // Merge any locally-stored recent conversations (created while offline or
        // before the backend populated the conversations index). This ensures
        // the sidebar at /messages reflects chats you opened or started from
        // the chat page (e.g., via product quick-message links).
        try {
          const localRaw = localStorage.getItem('recentConversations')
          if (localRaw) {
            const localList = JSON.parse(localRaw)
            for (const lc of localList) {
              if (!updatedConversations.find((c: Conversation) => c._id === lc._id)) {
                updatedConversations.push(lc)
              }
            }
          }
        } catch (err) {
          // ignore malformed local data
          console.warn('Could not merge local recentConversations:', err)
        }

            // Remove any malformed entries that lack a usable _id. These cannot
            // be navigated to and cause the UI to redirect to /messages/undefined.
            const validConversations = (updatedConversations || []).filter(
              (c: any) => c && typeof c._id === 'string' && c._id.trim() !== ''
            )

            // Sort by most recent message
            validConversations.sort((a: any, b: any) => {
              return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
            })

            // Set conversations (merged with local ones earlier)
            setConversations(validConversations)

            // Persist a trimmed, valid recentConversations list back to localStorage
            try {
              localStorage.setItem('recentConversations', JSON.stringify(validConversations.slice(0, 50)))
            } catch (err) {
              // ignore storage errors
            }

        // If user is on the generic /messages page, auto-open the most recent
        // conversation so the right-hand chat pane shows the latest thread.
        // We use replace() to avoid adding a history entry.
        try {
              if (pathname === '/messages' && validConversations.length > 0) {
                // Use the already-validated list when deciding which convo to open
                const first = validConversations[0]
                if (first && first._id) {
                  router.replace(`/messages/${first._id}`)
                } else {
                  // eslint-disable-next-line no-console
                  console.warn('Messages layout: no valid conversation id to auto-open', validConversations)
                }
              }
        } catch (err) {
          // ignore router errors in non-browser environments
        }
      } catch (error) {
        console.error('Error fetching conversations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()
    const interval = setInterval(fetchConversations, 10000) // Poll for updates
    return () => clearInterval(interval)
  }, [user, pathname])

  return (
    <DashboardLayout>
  <h2 className="text-xl font-semibold text-gray-900 mb-2 mt-2 ml-1">Messages</h2>
  <div className="h-[calc(100vh-10rem)] w-full bg-white mb-0">
        <div className="h-full">
          <div className="bg-[#0F172A] rounded-xl shadow-lg h-full overflow-hidden flex">
            {/* Left sidebar - Conversations list */}
            <div className="w-[40%] border-r border-gray-800">
              <div className="p-4 border-b border-gray-800">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search conversations..."
                    className="pl-9 bg-gray-900 border-gray-700 text-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="h-[calc(100%-5rem)] overflow-hidden">
                {loading ? (
                  <div className="p-4 text-gray-400">Loading conversations...</div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-4 text-gray-400">No conversations found</div>
                ) : (
                  filteredConversations.map((conv) => {
                    const isSelected = pathname.includes(conv._id)
                    const otherPartyName = conv.senderName === user?.name ? conv.receiverName : conv.senderName

                    return (
                      <Link key={conv._id} href={`/messages/${conv._id}`}>
                        <div className={cn(
                          "p-4 border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer",
                          isSelected && "bg-gray-800"
                        )}>
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-medium text-white">{otherPartyName}</h3>
                              <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                                {conv.lastMessage}
                              </p>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-gray-500">{formatDateShort(conv.lastMessageTime)}</span>
                              {conv.unreadCount ? (
                                <span className="mt-1 px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                                  {conv.unreadCount}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })
                )}
              </div>
            </div>

            {/* Right side - Chat area */}
            <div className="flex-1 flex flex-col">
              {pathname === '/messages' ? (
                <div className="h-full flex flex-col items-center justify-center bg-[#0F172A] text-gray-400">
                  <div className="text-center max-w-md p-8 rounded-2xl">
                    <div className="w-16 h-16 mx-auto mb-6 bg-blue-600/10 rounded-full flex items-center justify-center">
                      <Mail className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-semibold text-white mb-3">Select a conversation</h3>
                    <p className="text-sm text-gray-400">Choose a conversation from the sidebar to start messaging with suppliers and customers</p>
                  </div>
                </div>
              ) : (
                children
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}