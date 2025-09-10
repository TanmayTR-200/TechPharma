'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-new';
import { API_ENDPOINTS, fetcher } from '@/lib/api-config';
import { ConversationList } from '@/components/conversation-list';
import { MessageThread } from '@/components/message-thread';
import { Conversation } from '@/types/message';

export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedConversation, setSelectedConversation] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const searchParams = new URLSearchParams(window.location.search);
  const productId = searchParams.get('product');
  const sellerId = searchParams.get('seller');

  useEffect(() => {
    // Prevent page scrolling when on messages page
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No auth token found');
        return;
      }

      const data = await fetcher(API_ENDPOINTS.messages.conversations, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      // Handle both array and object responses
      setConversations(Array.isArray(data) ? data : data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch conversations');
    }
  };

  // Effect for initial auth check and conversation selection
  useEffect(() => {
    if (!user) {
      router.push('/auth?mode=login');
      return;
    }

    // Check for active conversation ID in URL
    const activeConversationId = searchParams.get('active');
    const sellerName = searchParams.get('name');
    
    if (activeConversationId) {
      // Immediately set the conversation active
      setSelectedConversation({
        id: activeConversationId,
        name: decodeURIComponent(sellerName || '') || 'Seller'
      });
      // Clean up URL without reloading
      window.history.replaceState({}, '', '/messages');
    }

    // Handle new conversation if product and seller IDs are present
    if (productId && sellerId) {
      const startNewConversation = async () => {
        try {
          setError(null);
          const token = localStorage.getItem('token');
          
          if (!token) {
            setError('Authentication token not found. Please login again.');
            router.push('/auth?mode=login');
            return;
          }

          console.log('Starting conversation with:', {
            sellerId,
            token: token ? 'present' : 'missing'
          });
          
          // Log request details for debugging
          const requestBody = {
            receiverId: sellerId,
            content: `Hi, I'm interested in your product. Can you provide more information?`,
          };
          console.log('Request body:', requestBody);

          const data = await fetcher(API_ENDPOINTS.messages.base, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              receiverId: sellerId,
              content: `Hi, I'm interested in your product. Can you provide more information?`,
              productId: productId // Now we'll send the productId since it might be useful
            })
          });

          // Refresh conversations list
          await fetchConversations();
          
          // Select the new conversation
          if (data._id) { // Check for conversation ID in response
            setSelectedConversation({
              id: data._id,
              name: data.receiver?.name || 'Seller' // Fallback name if not provided
            });
          }
        } catch (error) {
          console.error('Error starting conversation:', error);
          setError(error instanceof Error ? error.message : 'Failed to start conversation');
        }
      };

      startNewConversation();
      // Clear the URL parameters after starting the conversation
      router.replace('/messages');
    }
  }, [user, router, productId, sellerId]);

  // Effect to fetch conversations and handle URL parameters
  useEffect(() => {
    const loadConversations = async () => {
      if (user) {
        await fetchConversations();
        const conversationId = searchParams.get('conversation');
        if (conversationId) {
          // Add a small delay to ensure conversations are loaded
          setTimeout(() => {
            const conversation = conversations.find(c => c._id === conversationId);
            if (conversation) {
              setSelectedConversation({
                id: conversationId,
                name: conversation.otherUser?.name || 'Unknown User'
              });
            }
          }, 100);
        }
      }
    };
    loadConversations();
  }, [user, searchParams]);

  if (!user) {
    return null;
  }

  return (
    <div className="flex-1 h-[calc(100vh-4rem)]">
      <main className="flex flex-col h-full">
        <div className="h-4"></div>
        <div className="px-6 pt-4 pb-4">
          <h1 className="text-2xl font-semibold text-white">Messages</h1>
        </div>
        <div className="flex-1 flex gap-6 px-6 pb-6 min-h-0">
          <section className="w-[350px] bg-[#0F1629] rounded-lg border border-gray-800 overflow-hidden flex flex-col max-h-[calc(100vh-11rem)]">
            <ConversationList
              selectedId={selectedConversation?.id}
              onSelect={(id) => {
                const conversation = conversations.find(c => c._id === id);
                if (conversation) {
                  setSelectedConversation({
                    id,
                    name: conversation.otherUser.name
                  });
                }
              }}
            />
          </section>
          <section className="flex-1 bg-[#0F1629] rounded-lg border border-gray-800 overflow-hidden max-h-[calc(100vh-11rem)]">
            {selectedConversation ? (
              <MessageThread
                conversationId={selectedConversation.id}
                otherUserName={selectedConversation.name}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-400">
                Select a conversation to start messaging
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
