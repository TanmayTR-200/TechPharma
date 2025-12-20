"use client"

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { API_ENDPOINTS, fetcher } from '@/lib/api-config';
import { formatDateTime } from '@/lib/formatDate';

interface Message {
  _id: string;
  sender: string;
  receiver: string;
  content: string;
  createdAt: string;
  senderName: string;
  receiverName: string;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      // Guard early for missing auth information. Do this outside the try/finally
      // so we don't accidentally skip the finally block and leave the page
      // stuck in a loading state.
      const token = localStorage.getItem('token');
      if (!token || !user) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetcher(`${API_ENDPOINTS.messages.list}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        setMessages(response.messages || []);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [user]);

  return (
    <div className="h-screen flex flex-col">
      {/* Fixed Header */}
      <div className="flex-none p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-white">Messages</h1>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-800 rounded-lg"/>
              ))}
            </div>
          ) : !messages.length ? (
            <Card className="bg-gray-900 border-gray-700">
              <CardContent className="py-12">
                <div className="text-center text-gray-300">
                  <p className="text-lg font-medium">No messages yet</p>
                  <p className="text-sm mt-1">Your messages will appear here</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <Card key={message._id} className="bg-gray-900 border-gray-700 hover:border-blue-500 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">
                      {user?._id === message.sender ? message.receiverName : message.senderName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300">{message.content}</p>
                    <p className="text-sm text-gray-400 mt-2">{formatDateTime(message.createdAt)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}