"use client";

import React, { useEffect, useState, useRef } from 'react';
import DateSeparator from '@/components/date-separator';
import { useSearchParams } from 'next/navigation';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { API_ENDPOINTS, fetcher } from '@/lib/api-config';

interface Seller {
  name: string;
}

interface ProductInfo {
  id: string;
  name: string;
  description?: string;
  price?: number;
}

interface Message {
  _id: string;
  content: string;
  senderId: string;
  receiverId: string;
  timestamp: string;
  read: boolean;
  productInfo?: ProductInfo;
}

const parseMessageContent = (content: string, productInfo?: ProductInfo) => {
  if (!productInfo) {
    const match = content.match(/getting more details about the product: (.+)$/);
    if (match) {
      return content;
    }
    return content;
  }
  return content.replace(
    productInfo.name,
    `<a href="/products/${productInfo.id}" class="text-blue-300 hover:text-blue-200 underline">${productInfo.name}</a>`
  );
};

export default function ChatPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const productParam = searchParams.get('product');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const response = await fetcher(API_ENDPOINTS.users.get(params.id as string), {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.user && response.user.name) {
          setSeller({ name: response.user.name });
        } else {
          setSeller({ name: 'Unknown Seller' });
        }
      } catch (error) {
        setSeller({ name: 'Unknown Seller' });
      }
    };
    fetchUser();
  }, [params.id]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetcher(API_ENDPOINTS.messages.list(params.id as string), {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.success && response.messages) {
        setMessages(response.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Fetch messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [params.id]);

  // Scroll to bottom whenever messages change (new messages, initial load)
  useEffect(() => {
    if (!scrollRef.current) return
    // small timeout to let DOM update
    const t = setTimeout(() => {
      try {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
      } catch (e) {
        scrollRef.current!.scrollTop = scrollRef.current!.scrollHeight
      }
    }, 50)
    return () => clearTimeout(t)
  }, [messages.length])

  // Also scroll to bottom whenever the conversation id changes (open a chat)
  useEffect(() => {
    if (!scrollRef.current) return
    const t = setTimeout(() => {
      try {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
      } catch (e) {
        scrollRef.current!.scrollTop = scrollRef.current!.scrollHeight
      }
    }, 100)
    return () => clearTimeout(t)
  }, [params.id])

  useEffect(() => {
    if (productParam) {
      try {
        const parsedProduct: ProductInfo = JSON.parse(decodeURIComponent(productParam));
        const defaultMessage = `I am interested in getting more details about the product: ${parsedProduct.name}`;
        setMessage(defaultMessage);
        // If this is a new conversation, store the product info for the initial message
        if (messages.length === 0) {
          localStorage.setItem(`product_${Date.now()}`, JSON.stringify(parsedProduct));
        }
      } catch (error) {
        console.error('Error parsing product info:', error);
      }
    }
  }, [productParam, messages.length]);

  const handleSend = async () => {
    if (!message.trim()) return;
    const messageToSend = message;
    setMessage(''); // Clear input immediately for better UX

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetcher(API_ENDPOINTS.messages.send, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: params.id,
          content: messageToSend,
        }),
      });

      if (response.success && response.message) {
        // If this is a product inquiry message, attach the product info
        let updatedMessage = response.message;
        if (productParam) {
          try {
            const parsedProduct: ProductInfo = JSON.parse(decodeURIComponent(productParam));
            updatedMessage = {
              ...response.message,
              productInfo: {
                id: parsedProduct.id,
                name: parsedProduct.name
              }
            };
          } catch (error) {
            console.error('Error attaching product info to message:', error);
          }
        }
        setMessages(prev => [...prev, updatedMessage]);
        // Update local recent conversations so the sidebar at /messages shows this chat
        try {
          const raw = localStorage.getItem('recentConversations')
          const list = raw ? JSON.parse(raw) : []
          const existingIndex = list.findIndex((c: any) => c._id === params.id)
          const entry = {
            _id: params.id,
            sender: params.id, // receiver id stored in _id; server may use other shape
            receiver: params.id,
            lastMessage: updatedMessage.content || updatedMessage.message || 'New conversation',
            lastMessageTime: updatedMessage.timestamp || new Date().toISOString(),
            senderName: seller?.name || '',
            receiverName: seller?.name || ''
          }
          if (existingIndex >= 0) {
            list[existingIndex] = { ...list[existingIndex], ...entry }
          } else {
            list.unshift(entry)
          }
          // keep only recent 50
          localStorage.setItem('recentConversations', JSON.stringify(list.slice(0, 50)))
        } catch (err) {
          console.warn('Could not persist recentConversations', err)
        }
      } else {
        // If the message failed to send, restore it to the input
        setMessage(messageToSend);
        throw new Error('Failed to send message');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      alert(error.message || 'Failed to send message. Please try again.');
      setMessage(messageToSend); // Restore message if send failed
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 overflow-hidden">
      {/* Chat header */}
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-medium text-white">{seller?.name || 'Unknown Seller'}</h2>
      </div>
  {/* Messages area */}
  <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Start the conversation by sending a message</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {messages.map((msg, idx) => {
              const prev = messages[idx - 1]
              const msgDay = new Date(msg.timestamp).toDateString()
              const prevDay = prev ? new Date(prev.timestamp).toDateString() : null
              return (
                <React.Fragment key={msg._id}>
                  {/* Insert date separator when day changes or for the first message */}
                  {idx === 0 || msgDay !== prevDay ? (
                        <div className="py-2">
                          <DateSeparator date={msg.timestamp} />
                        </div>
                      ) : null}

                  <div className={`flex ${msg.senderId === params.id ? 'justify-start' : 'justify-end'} py-1`}> 
                    <div
                      className={`max-w-[75%] rounded-lg px-4 py-2 ${
                        msg.senderId === params.id
                          ? 'bg-gray-700 text-white'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      <p className="text-sm">
                        {msg.content.includes("getting more details about the product:") ? (
                          <>
                            {msg.content.split("getting more details about the product: ")[0]}
                            getting more details about the product:{" "}
                            <Link
                              href={msg.productInfo?.id ? `/products/${msg.productInfo.id}` : `/products`}
                              className="text-blue-300 hover:text-blue-200 underline"
                            >
                              {msg.productInfo?.name || msg.content.split("getting more details about the product: ")[1]}
                            </Link>
                          </>
                        ) : (
                          msg.content
                        )}
                      </p>
                      <p className="text-xs mt-1 opacity-75">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </React.Fragment>
              )
            })}
          </div>
        )}
      </div>
      {/* Message input */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-gray-800 border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={256}
          />
          <button
            onClick={handleSend}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors h-fit"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}