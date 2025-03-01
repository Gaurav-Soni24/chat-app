import type { Timestamp } from "firebase/firestore"

// Add this to your @/types.ts file

export interface User {
  id: string
  email: string
  displayName: string
  photoURL: string
}

export interface Chat {
  id: string
  lastMessage: string | null
  lastMessageTime: string | null
  participants: string[]
  unreadCount: number
  otherUser: {
    id: string
    displayName: string
    photoURL: string
  }
}

export interface Message {
  id: string
  text: string
  senderId: string
  senderName: string
  timestamp: Timestamp
  read: boolean
  reactions: Record<string, string>
}

