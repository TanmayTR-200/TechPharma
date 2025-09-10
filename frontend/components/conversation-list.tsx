'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-new';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { API_ENDPOINTS, fetcher } from '@/lib/api-config';
import { Conversation } from '@/types/message';
import { formatDistanceToNow } from 'date-fns';

interface ConversationListProps {
  selectedId?: string;
  onSelect: (conversationId: string) => void;
}

interface ConversationResponse {
  _id: string;
  participants: Array<{
    _id: string;
    firstName?: string;
    lastName?: string;
    name?: string;
  }>;
  lastMessage?: {
    content: string;
    createdAt: string;
    senderId: string;
  };
  otherUser?: {
    _id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
  };
  unreadCount?: number;
  product?: {
    _id: string;
    name: string;
  };
}

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    let isSubscribed = true;
    const fetchConversations = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication token not found');
          setLoading(false);
          return;
        }

        const data = await fetcher(API_ENDPOINTS.messages.conversations, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          }
        });

        // Only update state if the component is still mounted
        if (!isSubscribed) return;
        // Handle both array and object responses
        const conversationData = Array.isArray(data) ? data : data.conversations || [];
        setConversations(conversationData);
        setError(null);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        setError('Failed to load conversations');
        setConversations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
    
    // Poll for new messages every 30 seconds
    const interval = setInterval(fetchConversations, 30000);
    
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="h-full">
        <div className="h-full overflow-auto">
          <div className="p-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full">
        <div className="h-full overflow-auto">
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white">Recent Conversations</h2>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-1">
          {Array.isArray(conversations) && conversations.map((conversation) => (
            <div
              key={conversation._id}
              onClick={() => onSelect(conversation._id)}
              className={`p-4 rounded-lg cursor-pointer transition-colors ${
                selectedId === conversation._id
                  ? 'bg-[#1B2337]'
                  : 'hover:bg-[#151B2E]'
              }`}
            >
              <div className="flex items-start gap-3">
                <Avatar className="bg-blue-600 text-white">
                  <AvatarFallback>
                    {conversation.otherUser?.name 
                      ? conversation.otherUser.name
                          .split(' ')
                          .map((n) => n?.[0] || '')
                          .join('')
                      : '??'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate text-white">
                      {conversation.otherUser?.name || 'Unknown User'}
                    </p>
                    <span className="text-xs text-gray-400">
                      {conversation.lastMessage?.createdAt 
                        ? formatDistanceToNow(new Date(conversation.lastMessage.createdAt), {
                            addSuffix: true
                          })
                        : 'Just now'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 truncate">
                    {conversation.lastMessage?.senderId === user?._id ? 'You: ' : ''}
                    {conversation.lastMessage?.content?.includes('\nProduct:') 
                      ? 'Inquiry about ' + conversation.lastMessage.content.split('\nProduct:')[1].split('\nLink:')[0].trim()
                      : conversation.lastMessage?.content || 'No message'
                    }
                  </p>
                  {(conversation.unreadCount || 0) > 0 && (
                    <Badge variant="secondary" className="mt-1 bg-blue-600 text-white">
                      {conversation.unreadCount} new
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="text-center py-8 text-neutral-400">
              No conversations yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
