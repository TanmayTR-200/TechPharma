'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-new';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { Message } from '@/types/message';
import { formatDistanceToNow } from 'date-fns';
import { API_ENDPOINTS, fetcher } from '@/lib/api-config';

interface MessageThreadProps {
  conversationId: string;
  otherUserName: string;
}

export function MessageThread({ conversationId, otherUserName }: MessageThreadProps) {
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [productInfo, setProductInfo] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Constants
  const MAX_RETRIES = 3;
  const POLLING_INTERVAL = 10000;
  const ERROR_POLLING_INTERVAL = 30000;
  
  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { user } = useAuth();

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !mountedRef.current) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to view messages');
        return;
      }

      // Track retry attempts
      const currentRetry = retryCount + 1;
      setRetryCount(currentRetry);

      const data = await fetcher(`${API_ENDPOINTS.messages.conversations}/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!mountedRef.current) return;

      // Reset retry count on successful fetch
      setRetryCount(0);

      // Validate data structure
      if (!data) {
        throw new Error('No data received from server');
      }

      // Update product info if available
      if (data.product) {
        setProductInfo({
          id: data.product._id || data.product.id,
          name: data.product.name
        });
      }

      // Process messages with validation
      const messageArray = Array.isArray(data) ? data : (data.messages || []);
      const processedMessages = messageArray
        .filter((message: any) => 
          message && (message._id || message.id) && message.content
        )
        .map((message: Message) => {
          // Get the sender ID, handling different object shapes
          let senderId = message.senderId;
          if (typeof senderId === 'object' && senderId !== null) {
            senderId = (senderId as any)._id || (senderId as any).id || '';
          }

          return {
            ...message,
            _id: message._id || message.id || '', // Ensure we have an ID
            id: message._id || message.id || '', // Keep both ID formats
            senderId: senderId,
            content: message.content || '',
            createdAt: message.createdAt || new Date().toISOString()
          };
        });

      setMessages([...processedMessages].reverse());
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;

      // Get a user-friendly error message
      let errorMessage = 'Could not load messages';
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch') || err.message.includes('Network')) {
          errorMessage = 'Connection lost. Retrying...';
        } else if (err.message.includes('timeout')) {
          errorMessage = 'Server is taking too long to respond. Retrying...';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      console.error('Error fetching messages:', {
        error: err,
        attempt: retryCount,
        conversationId
      });

      // If we've tried too many times, increase the polling interval
      if (retryCount >= MAX_RETRIES) {
        setError('Having trouble connecting. Will keep trying...');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [conversationId]);

  // Set up polling
  useEffect(() => {
    if (!conversationId) return;

    const poll = async () => {
      await fetchMessages();
      if (mountedRef.current) {
        pollTimeoutRef.current = setTimeout(poll, error ? 30000 : 10000);
      }
    };

    poll();

    return () => {
      mountedRef.current = false;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [conversationId, fetchMessages, error]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !conversationId) return;

    try {
      setSending(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No auth token found');
      }

      // First, get the conversation details to get the receiver ID
      const convData = await fetcher(`${API_ENDPOINTS.messages.conversations}/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const otherParticipant = Array.isArray(convData) ? 
        convData[0]?.otherUser?._id : 
        convData.otherUser?._id;

      if (!otherParticipant) {
        throw new Error('Could not determine message recipient');
      }

      await fetcher(API_ENDPOINTS.messages.base, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receiverId: otherParticipant,
          content: newMessage.trim(),
          conversationId: conversationId
        })
      });

      setNewMessage('');
      await fetchMessages(); // Refresh messages
    } catch (err: any) {
      let errorMessage = 'Failed to send message';
      if (err.message.includes('Network error')) {
        errorMessage = 'Connection issue: Please check your internet connection';
      } else if (err.message.includes('timed out')) {
        errorMessage = 'Message sending timed out. Please try again';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none p-3 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white">{otherUserName}</h2>
        {error && (
          <div className="mt-2 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>
      <div 
        className="flex-1 overflow-y-auto p-3 min-h-0 scrollbar scrollbar-w-1.5 scrollbar-thumb-[#1B2337] scrollbar-track-[#0F1629] hover:scrollbar-thumb-[#151B2E]" 
        ref={scrollRef}>
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-10 bg-[#1B2337] rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : (
            messages.map((message) => {
              const senderId = typeof message.senderId === 'string' 
                ? message.senderId 
                : message.senderId?._id;
              const isSender = senderId === user?._id;
              return (
                <div
                  key={message._id}
                  className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`rounded-lg px-3 py-1.5 max-w-[70%] text-sm ${
                      isSender
                        ? 'bg-[#1B2337] text-white'
                        : 'bg-[#1B2337] text-white'
                    }`}
                  >
                    {message.content.toLowerCase().includes("hi, i'm interested in your product") ? (
                      <>
                        <p className="break-words">
                          Hi, I'm interested in your product. Can you provide more information?
                        </p>
                        <div className="mt-2 bg-[#151B2E] rounded-md p-3">
                          <p className="text-sm text-gray-400">
                            Inquiring about: <span className="text-white">{message.content.split('\nProduct:')[1]?.trim().split('\nLink:')[0]}</span>
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <a 
                              href={`/products/${message.productId || message.content.split('\nLink:')[1]?.trim() || '#'}`}
                              className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                            >
                              View Product
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="break-words">{message.content}</p>
                    )}
                    <span className={`text-xs ${
                      isSender ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {formatDistanceToNow(new Date(message.createdAt), {
                        addSuffix: true
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      <div className="flex-none px-3 pb-2 mt-auto border-t border-gray-800">
        {error && (
          <div className="text-xs text-red-400 mb-1 text-center">
            {error}
          </div>
        )}
        <div className="flex items-end gap-2 max-w-[98%] mx-auto">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={error ? "Connection issues..." : "Type a message..."}
            className="resize-none bg-[#1B2337] text-white border-[#1B2337] focus:border-[#1B2337] min-h-[32px] p-2"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={sending || !newMessage.trim()}
            size="icon"
            className="bg-[#1B2337] hover:bg-[#151B2E] text-white shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
