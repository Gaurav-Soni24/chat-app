// Add this to your @/types file (e.g., types/index.ts)

export interface User {
  id: string
  email: string
  displayName: string
  photoURL?: string
}

export interface Chat {
  id: string
  lastMessage: string | null
  lastMessageTime: string | null
  participants: string[]
  unreadCount: number // Added unreadCount
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
  timestamp: any
  read: boolean
  reactions: Record<string, string>
}