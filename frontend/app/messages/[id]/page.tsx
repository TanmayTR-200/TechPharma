"use client";

import React, { useEffect, useState, useRef } from 'react';
import DateSeparator from '@/components/date-separator';
import { useSearchParams, useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { ProductPreviewDialog } from '@/components/product-preview-dialog';
import { API_ENDPOINTS, fetcher } from '@/lib/api-config';
import DashboardLayout from '@/components/dashboard-layout';
import { ArrowLeft } from 'lucide-react';

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
    `<a href="/products/${productInfo.id}" class="text-primary hover:text-primary underline">${productInfo.name}</a>`
  );
};

export default function ChatPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const messagesRef = useRef<Message[]>([])
  const productParam = searchParams.get('product');
  const [previewProductId, setPreviewProductId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [productsCache, setProductsCache] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // Fetch products to match names to IDs
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetcher(API_ENDPOINTS.products.list(), {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        if (response.success && response.products) {
          console.log('Products cache loaded:', response.products.length, 'products');
          setProductsCache(response.products);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };
    fetchProducts();
  }, []);

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
        // Only update state if the message list actually changed (avoids re-render flash on every 5s poll)
        const next = response.messages;
        const changed =
          next.length !== messagesRef.current.length ||
          next.some((m: any, i: number) => m._id !== (messagesRef.current[i]?._id));
        if (changed) {
          messagesRef.current = next;
          setMessages(next);
        }
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
        setMessage(`I am interested in getting more details about the product: ${parsedProduct.name}`);
      } catch (error) {
        console.error('Error parsing product info:', error);
      }
    }
  }, [productParam, params.id]);

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
        setMessages(prev => {
          const next = [...prev, updatedMessage];
          messagesRef.current = next;
          return next;
        });
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
    <DashboardLayout>
      <ProductPreviewDialog
        product={selectedProduct}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setSelectedProduct(null);
        }}
      />
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.push('/messages')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to messages
        </button>
      </div>
      <div className="flex flex-col bg-card overflow-hidden rounded-lg border border-border" style={{ height: 'calc(100vh - 220px)' }}>
        {/* Chat header */}
        <div className="p-4 border-b border-border">
          <button
            onClick={() => router.push('/supplier/' + params.id)}
            className="text-lg font-medium text-foreground hover:text-primary transition-colors text-left"
            title="View seller profile"
          >
            {seller?.name || 'Unknown Seller'}
          </button>
        </div>
        {/* Messages area */}
        <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Start the conversation by sending a message</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {messages.map((msg, idx) => {
                const prev = messages[idx - 1]
                const msgDay = new Date(msg.timestamp).toDateString()
                const prevDay = prev ? new Date(prev.timestamp).toDateString() : null
                const isSentByMe = msg.senderId !== params.id
                    return (
                  <React.Fragment key={msg._id}>
                    {/* Insert date separator when day changes or for the first message */}
                    {idx === 0 || msgDay !== prevDay ? (
                      <div className="py-2">
                        <DateSeparator date={msg.timestamp} />
                      </div>
                    ) : null}

                    <div className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'} py-1`}> 
                      <div
                        className={`max-w-[75%] rounded-lg px-4 py-2 ${
                          isSentByMe
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <p className="text-sm">
                          {msg.content.includes("getting more details about the product:") ? (
                            <>
                              {msg.content.split("getting more details about the product: ")[0]}
                              getting more details about the product:{" "}
                              <button
                                onClick={() => {
                                  const productName = msg.productInfo?.name || msg.content.split("getting more details about the product: ")[1];
                                  
                                  // Find product from cache
                                  const matchedProduct = productsCache.find(
                                    p => p.name.toLowerCase().trim() === productName.toLowerCase().trim()
                                  );
                                  
                                  if (matchedProduct) {
                                    setSelectedProduct(matchedProduct);
                                    setIsPreviewOpen(true);
                                  } else {
                                    alert(`Product "${productName}" not found. It may have been removed.`);
                                  }
                                }}
                                className="text-background underline cursor-pointer bg-transparent border-0"
                              >
                                {msg.productInfo?.name || msg.content.split("getting more details about the product: ")[1]}
                              </button>
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
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your message..."
              className="flex-1 bg-muted border-border text-foreground rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              maxLength={256}
            />
            <button
              onClick={handleSend}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors h-fit"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}