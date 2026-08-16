'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, X, Archive, Trash2, Check, CheckCheck, ArchiveRestore, ArrowLeft } from 'lucide-react'
import { useNotifications } from '@/contexts/notification-context'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDateTime } from '@/lib/formatDate'

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, archiveNotification, unarchiveNotification, deleteNotification } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [filter, setFilter] = useState<'all' | 'read' | 'unread'>('all')

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getFiltered = () => {
    let list = showArchived
      ? notifications.filter(n => n.archived)
      : notifications.filter(n => !n.archived)
    if (filter === 'read') list = list.filter(n => n.read)
    if (filter === 'unread') list = list.filter(n => !n.read)
    return list
  }

  const filtered = getFiltered()
  const archivedCount = notifications.filter(n => n.archived).length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-md p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] border border-border overflow-hidden rounded-xl bg-background shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-background">
            <div className="flex items-center gap-2">
              {showArchived ? (
                <button
                  onClick={() => setShowArchived(false)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ArrowLeft className="h-3 w-3" /> Back to notifications
                </button>
              ) : (
                <>
                  <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                  {archivedCount > 0 && (
                    <button
                      onClick={() => setShowArchived(true)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Archive className="h-3 w-3" /> Archived ({archivedCount})
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!showArchived && unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <CheckCheck className="h-3 w-3" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          {!showArchived && (
            <div className="flex items-center gap-1 border-b border-border px-4 py-2">
              {(['all', 'unread', 'read'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={'px-2.5 py-1 rounded-md text-xs font-medium transition-colors ' + (filter === f ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50')}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          )}

          {/* List */}
          <ScrollArea className="max-h-[400px]">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8">
                <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {showArchived ? 'No archived notifications' : filter === 'unread' ? 'No unread notifications' : filter === 'read' ? 'No read notifications' : 'No notifications yet'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((notif) => (
                  <div
                    key={notif._id}
                    className={'flex items-start gap-3 p-3 hover:bg-secondary/30 transition-colors ' + (!notif.read && !showArchived ? 'bg-primary/5' : '')}
                  >
                    <div className={'mt-1.5 h-2 w-2 shrink-0 rounded-full ' + (notif.read ? 'bg-transparent' : 'bg-primary')} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-foreground">{notif.title}</p>
                        {!notif.read && !showArchived && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">New</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {notif.createdAt ? formatDateTime(notif.createdAt) : ''}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {!notif.read && !showArchived && (
                        <button
                          onClick={() => markAsRead(notif._id)}
                          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                          title="Mark as read"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {!showArchived ? (
                        <button
                          onClick={() => archiveNotification(notif._id)}
                          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          title="Archive"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => unarchiveNotification(notif._id)}
                          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          title="Unarchive"
                        >
                          <ArchiveRestore className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notif._id)}
                        className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
