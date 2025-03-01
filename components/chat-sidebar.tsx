"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LogOut, Plus, Search } from "lucide-react"
import { auth, db } from "@/lib/firebase"
import { signOut } from "firebase/auth"
import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, setDoc, where } from "firebase/firestore"
import { useRouter } from "next/navigation"
import type { Chat, User } from "@/types"
import { deleteCookie } from "@/lib/cookies"

interface ChatSidebarProps {
  user: User | null
  selectedChat: string | null
  setSelectedChat: (chatId: string | null) => void
}

export function ChatSidebar({ user, selectedChat, setSelectedChat }: ChatSidebarProps) {
  const [chats, setChats] = useState<Chat[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showNewChatInput, setShowNewChatInput] = useState(false)
  const [newChatEmail, setNewChatEmail] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    if (!user) return

    const q = query(
      collection(db, "chats"), 
      where("participants", "array-contains", user.id),
      // This orderBy doesn't work on the initial query due to Firebase limitations,
      // but we'll sort the results in memory
    )

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatPromises = snapshot.docs.map(async (doc) => {
        const chatData = doc.data()
        const otherUserId = chatData.participants.find((id: string) => id !== user.id)
        const otherUserDoc = await getDoc(doc(db, "users", otherUserId))
        const otherUserData = otherUserDoc.data()

        // Get the last message from the messages subcollection
        let lastMessage = chatData.lastMessage || null
        let lastMessageTime = chatData.lastMessageTime || null
        let lastMessageSender = chatData.lastMessageSender || null

        // If we don't have lastMessage stored in the chat document, try to fetch it
        // This is a fallback in case you're not updating the chat document with lastMessage
        if (!lastMessage) {
          try {
            const messagesQuery = query(
              collection(db, "chats", doc.id, "messages"),
              orderBy("timestamp", "desc"),
            )
            const messagesSnapshot = await getDocs(messagesQuery)
            
            if (!messagesSnapshot.empty) {
              const latestMessage = messagesSnapshot.docs[0].data()
              lastMessage = latestMessage.text || "Media content"
              lastMessageTime = latestMessage.timestamp || null
              lastMessageSender = latestMessage.senderId || null
            }
          } catch (error) {
            console.error("Error fetching messages:", error)
          }
        }

        return {
          id: doc.id,
          lastMessage,
          lastMessageTime,
          lastMessageSender,
          participants: chatData.participants,
          otherUser: {
            id: otherUserId,
            displayName: otherUserData?.displayName || "User",
            photoURL:
              otherUserData?.photoURL ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUserData?.displayName || "User")}&background=random`,
          },
        }
      })

      const resolvedChats = await Promise.all(chatPromises)
      
      // Fix: Properly sort chats by lastMessageTime
      const sortedChats = resolvedChats.sort((a, b) => {
        // Place chats with no lastMessageTime at the bottom
        if (!a.lastMessageTime && !b.lastMessageTime) return 0
        if (!a.lastMessageTime) return 1
        if (!b.lastMessageTime) return -1
        
        // Convert string dates to timestamps for proper comparison
        const timeA = new Date(a.lastMessageTime).getTime()
        const timeB = new Date(b.lastMessageTime).getTime()
        
        // Sort in descending order (newest first)
        return timeB - timeA
      })

      setChats(sortedChats)
    })

    return () => unsubscribe()
  }, [user])

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      deleteCookie("user-session")
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const handleCreateNewChat = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!user || !newChatEmail) return

    try {
      // Find user by email
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("email", "==", newChatEmail))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        setError("User not found")
        return
      }

      const otherUser = querySnapshot.docs[0]
      const otherUserId = otherUser.id

      if (otherUserId === user.id) {
        setError("You cannot chat with yourself")
        return
      }

      // Check if chat already exists
      const chatsRef = collection(db, "chats")
      const chatQuery = query(chatsRef, where("participants", "array-contains", user.id))
      const chatSnapshot = await getDocs(chatQuery)

      const existingChat = chatSnapshot.docs.find((doc) => {
        const data = doc.data()
        return data.participants.includes(otherUserId)
      })

      if (existingChat) {
        setSelectedChat(existingChat.id)
        setShowNewChatInput(false)
        setNewChatEmail("")
        return
      }

      // Create new chat with current timestamp
      const newChatRef = doc(collection(db, "chats"))
      const currentTime = new Date().toISOString()
      await setDoc(newChatRef, {
        participants: [user.id, otherUserId],
        createdAt: currentTime,
        lastMessageTime: currentTime, 
      })

      setSelectedChat(newChatRef.id)
      setShowNewChatInput(false)
      setNewChatEmail("")
    } catch (error) {
      console.error("Error creating chat:", error)
      setError("Failed to create chat")
    }
  }

  // Filter chats based on search term
  const filteredChats = chats.filter((chat) =>
    chat.otherUser.displayName.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Format date for chat timestamp display
  const formatMessageTime = (timestamp: string) => {
    const messageDate = new Date(timestamp)
    const now = new Date()
    
    // If message is from today, show only time
    if (messageDate.toDateString() === now.toDateString()) {
      return messageDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
    
    // If message is from this week, show day name
    const diffDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 7) {
      return messageDate.toLocaleDateString([], { weekday: 'short' })
    }
    
    // Otherwise show date
    return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
  
  // Get the preview text for the last message
  const getLastMessagePreview = (chat: Chat) => {
    if (!chat.lastMessage) return "No messages yet"
    
    // Show "You: " or sender name prefix for the last message
    const isFromCurrentUser = chat.lastMessageSender === user?.id
    const prefix = isFromCurrentUser ? "You: " : ""
    
    // Truncate message if too long
    const maxLength = isFromCurrentUser ? 20 : 25 // Shorter limit when showing "You: " prefix
    if (chat.lastMessage.length > maxLength) {
      return `${prefix}${chat.lastMessage.substring(0, maxLength)}...`
    }
    
    return `${prefix}${chat.lastMessage}`
  }

  return (
    <div className="w-80 border-r bg-slate-100 dark:bg-slate-800 flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Avatar>
              <AvatarImage src={user?.photoURL} alt={user?.displayName} />
              <AvatarFallback>{user?.displayName?.substring(0, 2).toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{user?.displayName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
          <Input
            type="search"
            placeholder="Search conversations..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="p-4 border-b">
        {showNewChatInput ? (
          <form onSubmit={handleCreateNewChat} className="space-y-2">
            <Input
              placeholder="Enter user email"
              value={newChatEmail}
              onChange={(e) => setNewChatEmail(e.target.value)}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex space-x-2">
              <Button type="submit" size="sm" className="flex-1">
                Start Chat
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowNewChatInput(false)
                  setNewChatEmail("")
                  setError("")
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button className="w-full" onClick={() => setShowNewChatInput(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Chat
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
              <button
                key={chat.id}
                className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                  selectedChat === chat.id
                    ? "bg-slate-200 dark:bg-slate-700"
                    : "hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
                onClick={() => setSelectedChat(chat.id)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={chat.otherUser.photoURL} alt={chat.otherUser.displayName} />
                  <AvatarFallback>{chat.otherUser.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden text-left">
                  <p className="font-medium text-sm truncate">{chat.otherUser.displayName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {getLastMessagePreview(chat)}
                  </p>
                </div>
                {chat.lastMessageTime && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {formatMessageTime(chat.lastMessageTime)}
                  </span>
                )}
              </button>
            ))
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              {searchTerm ? "No conversations found" : "No chats yet"}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}