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
import { collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, where } from "firebase/firestore"
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

  // In ChatSidebar.tsx, inside the useEffect that fetches chats
  useEffect(() => {
    if (!user) return

    const q = query(collection(db, "chats"), where("participants", "array-contains", user.id))

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatPromises = snapshot.docs.map(async (doc) => {
        const chatData = doc.data()
        const otherUserId = chatData.participants.find((id: string) => id !== user.id)
        const otherUserDoc = await getDoc(doc(db, "users", otherUserId))
        const otherUserData = otherUserDoc.data()

        // Get unread messages count
        const messagesQuery = query(
          collection(db, "chats", doc.id, "messages"),
          where("senderId", "!=", user.id),
          where("read", "==", false)
        )
        const unreadSnapshot = await getDocs(messagesQuery)
        const unreadCount = unreadSnapshot.size

        return {
          id: doc.id,
          lastMessage: chatData.lastMessage || null,
          lastMessageTime: chatData.lastMessageTime || null,
          participants: chatData.participants,
          unreadCount, // Add unread count
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
      // Ensure proper sorting by lastMessageTime
      const sortedChats = resolvedChats.sort((a, b) => {
        if (!a.lastMessageTime) return 1
        if (!b.lastMessageTime) return -1
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
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

  // Add a function to format the timestamp relative to current time
  const formatTimeAgo = (timestamp: string) => {
    if (!timestamp) return "";

    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (60 * 1000));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return messageTime.toLocaleDateString();
  };

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
        lastMessageTime: currentTime, // Add this line to ensure sorting works
      })

      setSelectedChat(newChatRef.id)
      setShowNewChatInput(false)
      setNewChatEmail("")
    } catch (error) {
      console.error("Error creating chat:", error)
      setError("Failed to create chat")
    }
  }

  const filteredChats = chats.filter((chat) =>
    chat.otherUser.displayName.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="w-80 border-r bg-slate-100 dark:bg-slate-800 flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Avatar>
              <AvatarImage src={user?.photoURL} alt={user?.displayName} />
              <AvatarFallback>{user?.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
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
        // Update the chat list rendering section
          {filteredChats.length > 0 ? (
            <>
              {/* Recent chats section */}
              <div className="px-3 py-2">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">Recent Chats</h3>
              </div>
              {filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-colors ${selectedChat === chat.id
                    ? "bg-slate-200 dark:bg-slate-700"
                    : "hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  onClick={() => setSelectedChat(chat.id)}
                >
                  <Avatar className="h-10 w-10 relative">
                    <AvatarImage src={chat.otherUser.photoURL} alt={chat.otherUser.displayName} />
                    <AvatarFallback>{chat.otherUser.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    {chat.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                      </span>
                    )}
                  </Avatar>
                  <div className="flex-1 overflow-hidden text-left">
                    <p className="font-medium text-sm truncate">{chat.otherUser.displayName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {chat.lastMessage ? chat.lastMessage : "No messages yet"}
                    </p>
                  </div>
                  {chat.lastMessageTime && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatTimeAgo(chat.lastMessageTime)}
                    </span>
                  )}
                </button>
              ))}
            </>
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              {searchTerm ? "No conversations found" : "No conversations yet"}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

