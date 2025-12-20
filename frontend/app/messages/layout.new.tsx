"use client"

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { API_ENDPOINTS, fetcher } from '@/lib/api-config';
import { Search } from 'lucide-react';

interface Conversation {
  _id: string;
  sender: string;
  receiver: string;
  lastMessage: string;
  lastMessageTime: string;
  senderName: string;
  receiverName: string;
  unreadCount?: number;
}

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token || !user) return;

        const response = await fetcher(`${API_ENDPOINTS.messages.conversations}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        setConversations(response.conversations || []);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
    const interval = setInterval(fetchConversations, 10000); // Poll for updates
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden">
          <div className="grid grid-cols-12 h-[calc(100vh-8rem)]">
            {/* Conversations List (Left Sidebar) */}
            <div className="col-span-4 border-r border-gray-200 dark:border-gray-800 h-full overflow-hidden">
              <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h2>
                  <div className="mt-4 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search conversations..." 
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="p-4 space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-lg mb-2" />
                          <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-2/3" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-800">
                      {conversations.map((conv) => {
                        const isCurrentUser = user?._id === conv.sender;
                        const otherPersonId = isCurrentUser ? conv.receiver : conv.sender;
                        const otherPersonName = isCurrentUser ? conv.receiverName : conv.senderName;
                        const isActive = pathname === `/messages/${otherPersonId}`;

                        return (
                          <Link key={conv._id} href={`/messages/${otherPersonId}`}>
                            <div className={`p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                              isActive ? 'bg-blue-50 dark:bg-gray-800' : ''
                            }`}>
                              <div className="flex items-center justify-between">
                                <h3 className="text-gray-900 dark:text-white font-medium">
                                  {otherPersonName}
                                </h3>
                                <span className="text-xs text-gray-500">
                                  {new Date(conv.lastMessageTime).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                                {conv.lastMessage}
                              </p>
                              {conv.unreadCount ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-blue-600 rounded-full mt-1">
                                  {conv.unreadCount}
                                </span>
                              ) : null}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chat Window (Right Side) */}
            <div className="col-span-8 h-full bg-white dark:bg-gray-900">
              {pathname === '/messages' ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                      Select a conversation
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Choose a conversation from the left to start messaging
                    </p>
                  </div>
                </div>
              ) : (
                children
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}