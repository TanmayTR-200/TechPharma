import { User } from './user';

// Define common user reference type
type UserReference = string | User | { 
  _id?: string; 
  id?: string; 
  name?: string;
  company?: { name?: string };
};

export interface Message {
  _id?: string;
  id?: string;
  senderId: UserReference;
  receiverId: UserReference;
  productId?: string | number;
  content: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
  conversation?: string;
}

export interface Conversation {
  _id: string;
  lastMessage: Message;
  unreadCount: number;
  otherUser: User;
}

export interface MessagePagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}
