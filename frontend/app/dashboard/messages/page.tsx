"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-new"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, splitName } from "@/types/user"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Send } from "lucide-react"

interface Product {
  _id: string
  name: string
  images: string[]
}

interface Message {
  _id: string
  sender: User
  content: string
  createdAt: string
  read: boolean
}

interface Conversation {
  _id: string
  otherParticipant: User
  lastMessage: {
    content: string
    createdAt: string
    read: boolean
  }
  unreadCount: number
  product?: Product
}

export default function MessagesPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/messages/conversations")
        const data = await response.json()
        setConversations(data)
      } catch (error) {
        console.error("Failed to fetch conversations:", error)
        setError("Failed to load conversations")
      } finally {
        setIsLoading(false)
      }
    }

    fetchConversations()
  }, [])

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConversation) return

    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/messages/conversations/${selectedConversation}`)
        const data = await response.json()
        setMessages(data)
      } catch (error) {
        console.error("Failed to fetch messages:", error)
        setError("Failed to load messages")
      }
    }

    fetchMessages()
  }, [selectedConversation])

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    try {
      const conversation = conversations.find(c => c._id === selectedConversation)
      if (!conversation) return

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: conversation.otherParticipant._id,
          content: newMessage,
          productId: conversation.product?._id
        })
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      const newMessageData = await response.json()
      setMessages(prev => [...prev, newMessageData])
      setNewMessage("")
    } catch (error) {
      console.error("Failed to send message:", error)
      setError("Failed to send message")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-red-500 mb-4">{error}</div>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50/50">
      {/* Conversations List */}
      <div className="w-1/3 border-r bg-white">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Messages</h2>
        </div>
        <ScrollArea className="h-[calc(100vh-5rem)]">
          {conversations.map(conversation => (
            <div
              key={conversation._id}
              className={cn(
                "p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors",
                selectedConversation === conversation._id && "bg-primary/5"
              )}
              onClick={() => setSelectedConversation(conversation._id)}
            >
              <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback>
                    {(() => {
                      const { firstName, lastName } = splitName(conversation.otherParticipant.name);
                      return `${firstName[0]}${lastName[0] || ''}`
                    })()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">
                      {conversation.otherParticipant.name}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{conversation.otherParticipant.company?.name || 'Individual User'}</p>
                  {conversation.product && (
                    <p className="text-xs text-gray-400 mt-1">Re: {conversation.product.name}</p>
                  )}
                  <p className="text-sm text-gray-600 truncate mt-1">
                    {conversation.lastMessage.content}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(conversation.lastMessage.createdAt), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-white">
              {(() => {
                const conversation = conversations.find(c => c._id === selectedConversation)
                if (!conversation) return null
                return (
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        {(() => {
                          const { firstName, lastName } = splitName(conversation.otherParticipant.name);
                          return `${firstName[0]}${lastName[0] || ''}`
                        })()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">{conversation.otherParticipant.name}</h3>
                      <p className="text-sm text-gray-500">{conversation.otherParticipant.company?.name || 'Individual User'}</p>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map(message => (
                  <div
                    key={message._id}
                    className={cn(
                      "flex gap-2 max-w-[80%]",
                      message.sender._id === user?._id ? "ml-auto" : "mr-auto"
                    )}
                  >
                    {message.sender._id !== user?._id && (
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>
                          {(() => {
                            const { firstName, lastName } = splitName(message.sender.name);
                            return `${firstName[0]}${lastName[0] || ''}`
                          })()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        "rounded-lg p-3",
                        message.sender._id === user?._id
                          ? "bg-primary text-white"
                          : "bg-gray-100"
                      )}
                    >
                      <p>{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {format(new Date(message.createdAt), "h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyPress={e => e.key === "Enter" && sendMessage()}
                />
                <Button onClick={sendMessage}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  )
}
