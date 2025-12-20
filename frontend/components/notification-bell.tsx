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
        const [activeData, archivedData] = await Promise.all([
          fetcher(API_ENDPOINTS.notifications.list),
          fetcher(API_ENDPOINTS.notifications.listArchived)
        ]);
        setNotifications(activeData.notifications || []);
        setArchivedNotifications(archivedData.notifications || []);
        setUnreadCount(activeData.notifications?.filter((n: Notification) => !n.read).length || 0);
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
      await fetcher(API_ENDPOINTS.notifications.markAsRead(notificationId), {
        method: 'POST',
      });
      setNotifications(notifications.map(n => 
        n._id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const archiveNotification = async (notificationId: string) => {
    try {
      await fetcher(API_ENDPOINTS.notifications.archive(notificationId), {
        method: 'POST',
      });
      const archivedNotification = notifications.find(n => n._id === notificationId);
      if (archivedNotification) {
        setNotifications(notifications.filter(n => n._id !== notificationId));
        setArchivedNotifications([archivedNotification, ...archivedNotifications]);
        if (!archivedNotification.read) {
          setUnreadCount(Math.max(0, unreadCount - 1));
        }
      }
    } catch (error) {
      console.error('Error archiving notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetcher(API_ENDPOINTS.notifications.markAllAsRead, {
        method: 'POST',
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <DialogTitle>{showArchived ? 'Archived Notifications' : 'Notifications'}</DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowArchived(!showArchived)}
                  className="text-xs"
                >
                  {showArchived ? 'Show Active' : 'Show Archived'}
                </Button>
              </div>
              {!showArchived && unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Mark all as read
                </Button>
              )}
            </div>
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
                    key={notification._id || idx}
                    className={`p-4 rounded-lg border ${
                      notification.read ? 'bg-background' : 'bg-accent/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-medium">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">{formatDateTime(notification.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!notification.read && !showArchived && (
                          <>
                            <Badge variant="secondary" className="shrink-0">
                              New
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification._id);
                              }}
                              className="h-8 px-2 text-xs"
                            >
                              Mark as read
                            </Button>
                          </>
                        )}
                        {!showArchived && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              archiveNotification(notification._id);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                            >
                              <path d="M21 8v13H3V8"></path>
                              <path d="M1 3h22v5H1z"></path>
                              <path d="M10 12h4"></path>
                            </svg>
                          </Button>
                        )}
                      </div>
                    </div>
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