import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth';
import { API_ENDPOINTS, fetcher } from '@/lib/api-config';
import { formatDateTime } from '@/lib/formatDate';

interface Notification {
  _id: string;
  userId: string;
  type: 'order_placed' | 'order_confirmed' | 'order_shipped' | 'sale_made' | 'stock_update';
  title: string;
  message: string;
  read: boolean;
  archived?: boolean;
  createdAt: string;
  metadata?: {
    orderId?: string;
    productId?: string;
    quantity?: number;
    buyerId?: string;
    buyerName?: string;
  };
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [archivedNotifications, setArchivedNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'read' | 'unread'>('all');
  const { user } = useAuth();

  const getFilteredNotifications = () => {
    const currentList = showArchived ? archivedNotifications : notifications;
    return currentList.filter(n => {
      if (filterStatus === 'read') return n.read;
      if (filterStatus === 'unread') return !n.read;
      return true;
    });
  };

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const activeData = await fetcher(API_ENDPOINTS.notifications.list);
        const allNotifications = activeData.notifications || [];
        
        // Separate active and archived notifications
        const active = allNotifications.filter((n: Notification) => !n.archived);
        const archived = allNotifications.filter((n: Notification) => n.archived);
        
        setNotifications(active);
        setArchivedNotifications(archived);
        setUnreadCount(active.filter((n: Notification) => !n.read).length || 0);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
    // Poll for new notifications every minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    try {
      if (!notificationId) {
        console.error('Invalid notification ID');
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) return;
      
      await fetcher(API_ENDPOINTS.notifications.markAsRead(notificationId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      setNotifications(notifications.map(n => 
        n._id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAsUnread = async (notificationId: string) => {
    try {
      if (!notificationId) {
        console.error('Invalid notification ID');
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Since there's no specific unread endpoint, we'll update locally
      // You may want to add a backend endpoint for this
      setNotifications(notifications.map(n => 
        n._id === notificationId ? { ...n, read: false } : n
      ));
      setUnreadCount(unreadCount + 1);
    } catch (error) {
      console.error('Error marking notification as unread:', error);
    }
  };

  const archiveNotification = async (notificationId: string) => {
    try {
      if (!notificationId) {
        console.error('Invalid notification ID');
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) return;
      
      await fetcher(API_ENDPOINTS.notifications.archive(notificationId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const archivedNotification = notifications.find(n => n._id === notificationId);
      if (archivedNotification) {
        setNotifications(notifications.filter(n => n._id !== notificationId));
        setArchivedNotifications([{...archivedNotification, archived: true}, ...archivedNotifications]);
        if (!archivedNotification.read) {
          setUnreadCount(Math.max(0, unreadCount - 1));
        }
      }
    } catch (error) {
      console.error('Error archiving notification:', error);
    }
  };

  const unarchiveNotification = async (notificationId: string) => {
    try {
      if (!notificationId) {
        console.error('Invalid notification ID');
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) return;
      
      await fetcher(API_ENDPOINTS.notifications.unarchive(notificationId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const unarchivedNotification = archivedNotifications.find(n => n._id === notificationId);
      if (unarchivedNotification) {
        setArchivedNotifications(archivedNotifications.filter(n => n._id !== notificationId));
        setNotifications([{...unarchivedNotification, archived: false}, ...notifications]);
        if (!unarchivedNotification.read) {
          setUnreadCount(unreadCount + 1);
        }
      }
    } catch (error) {
      console.error('Error unarchiving notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      await fetcher(API_ENDPOINTS.notifications.markAllAsRead, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(true)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader className="space-y-4 pr-8">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle>{showArchived ? 'Archived Notifications' : 'Notifications'}</DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowArchived(!showArchived)}
                  className="text-xs border-2 hover:bg-gray-100 whitespace-nowrap"
                >
                  {showArchived ? 'Show Active' : 'Show Archived'}
                </Button>
                {!showArchived && unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs border-2 hover:bg-gray-100 whitespace-nowrap"
                  >
                    Mark all as read
                  </Button>
                )}
              </div>
            </div>
            {!showArchived && (
              <div className="flex items-center justify-center gap-2 border-t pt-4">
                <Button
                  size="sm"
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('all')}
                  className={`flex-1 ${filterStatus === 'all' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'hover:bg-zinc-100'}`}
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === 'unread' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('unread')}
                  className={`flex-1 ${filterStatus === 'unread' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'hover:bg-zinc-100'}`}
                >
                  Unread
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === 'read' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('read')}
                  className={`flex-1 ${filterStatus === 'read' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'hover:bg-zinc-100'}`}
                >
                  Read
                </Button>
              </div>
            )}
          </DialogHeader>

          <ScrollArea className="h-[60vh] pr-4">
            {getFilteredNotifications().length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {showArchived 
                  ? 'No archived notifications'
                  : filterStatus === 'read'
                  ? 'No read notifications'
                  : filterStatus === 'unread'
                  ? 'No unread notifications'
                  : 'No notifications yet'}
              </div>
            ) : (
              <div className="space-y-4">
                {getFilteredNotifications().map((notification, idx) => (
                  <div
                    key={notification._id || `notification-${idx}`}
                    className={`p-4 rounded-lg border ${
                      notification.read ? 'bg-background' : 'bg-accent/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1">
                        <div className="flex items-start gap-2">
                          <h4 className="text-sm font-medium">{notification.title}</h4>
                          {!notification.read && !showArchived && (
                            <Badge variant="secondary" className="shrink-0">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">{formatDateTime(notification.createdAt)}</p>
                      </div>
                    </div>
                    {!showArchived && notification._id && (
                      <div className="flex items-center justify-end gap-2">
                        {!notification.read && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification._id);
                            }}
                            className="h-8 px-3 text-xs border-2"
                          >
                            Mark as read
                          </Button>
                        )}
                        {notification.read && filterStatus === 'read' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsUnread(notification._id);
                            }}
                            className="h-8 px-3 text-xs border-2"
                          >
                            Mark as unread
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            archiveNotification(notification._id);
                          }}
                          className="h-8 px-3 text-xs border-2"
                        >
                          Archive
                        </Button>
                      </div>
                    )}
                    {showArchived && notification._id && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            unarchiveNotification(notification._id);
                          }}
                          className="h-8 px-3 text-xs border-2"
                        >
                          Unarchive
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}