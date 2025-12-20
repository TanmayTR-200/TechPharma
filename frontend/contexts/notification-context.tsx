import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_ENDPOINTS, fetcher } from '@/lib/api-config';
import { useAuth } from './auth';

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

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, '_id' | 'createdAt'>) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const data = await fetcher(API_ENDPOINTS.notifications.list);
      setNotifications(data.notifications || []);
      setUnreadCount(data.notifications?.filter((n: Notification) => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, [user]);

  const addNotification = async (notification: Omit<Notification, '_id' | 'createdAt'>) => {
    try {
      const data = await fetcher(API_ENDPOINTS.notifications.create, {
        method: 'POST',
        body: JSON.stringify(notification),
      });
      setNotifications(prev => [data.notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetcher(API_ENDPOINTS.notifications.markAsRead(notificationId), {
        method: 'POST',
      });
      setNotifications(prev =>
        prev.map(n => (n._id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetcher(API_ENDPOINTS.notifications.markAllAsRead, {
        method: 'POST',
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};