"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send } from "lucide-react"
import { db } from "@/lib/firebase"
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  setDoc,
  getDocs,
  where,
  writeBatch
} from "firebase/firestore"
import type { Message, User } from "@/types"
import { MessageItem } from "@/components/message-item"
import { TypingIndicator } from "@/components/typing-indicator"

interface ChatWindowProps {
  user: User | null
  selectedChat: string | null
}

export function ChatWindow({ user, selectedChat }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [otherUser, setOtherUser] = useState<User | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch chat details and messages
  useEffect(() => {
    if (!selectedChat || !user) {
      setMessages([])
      setOtherUser(null)
      return
    }

    const fetchChatDetails = async () => {
      try {
        const chatDoc = await getDoc(doc(db, "chats", selectedChat))
        if (!chatDoc.exists()) return

        const chatData = chatDoc.data()
        const otherUserId = chatData.participants.find((id: string) => id !== user.id)
        const otherUserDoc = await getDoc(doc(db, "users", otherUserId))

        if (otherUserDoc.exists()) {
          const otherUserData = otherUserDoc.data()
          setOtherUser({
            id: otherUserId,
            email: otherUserData.email,
            displayName: otherUserData.displayName,
            photoURL: otherUserData.photoURL,
          })
        }
        
        // Mark all messages as read when chat is selected
        const markAllAsRead = async () => {
          const messagesQuery = query(
            collection(db, "chats", selectedChat, "messages"),
            where("senderId", "!=", user.id),
            where("read", "==", false)
          )
          const unreadSnapshot = await getDocs(messagesQuery)
          
          // Batch update to mark all as read
          if (unreadSnapshot.size > 0) {
            const batch = writeBatch(db)
            unreadSnapshot.docs.forEach((doc) => {
              batch.update(doc.ref, { read: true })
            })
            await batch.commit()
            console.log(`Marked ${unreadSnapshot.size} messages as read`)
          }
        }
        
        // Call the function when chat is selected
        markAllAsRead()
      } catch (error) {
        console.error("Error fetching chat details:", error)
      }
    }

    fetchChatDetails()

    // Listen for messages
    const q = query(collection(db, "chats", selectedChat, "messages"), orderBy("timestamp", "asc"))

    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[]

      setMessages(newMessages)

      // Mark messages as read
      newMessages.forEach(async (message) => {
        if (message.senderId !== user.id && !message.read) {
          await updateDoc(doc(db, "chats", selectedChat, "messages", message.id), {
            read: true,
          })
        }
      })
    })

    // Listen for typing status
    const typingRef = doc(db, "chats", selectedChat, "typing", "status")
    const unsubscribeTyping = onSnapshot(typingRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data()
        if (otherUser) {
          setOtherUserTyping(data[otherUser.id] || false)
        }
      }
    })

    return () => {
      unsubscribeMessages()
      unsubscribeTyping()
    }
  }, [selectedChat, user])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, otherUserTyping])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || !selectedChat || !user) return

    try {
      const currentTime = new Date().toISOString()

      // Add message to Firestore
      await addDoc(collection(db, "chats", selectedChat, "messages"), {
        text: newMessage,
        senderId: user.id,
        senderName: user.displayName,
        timestamp: serverTimestamp(),
        read: false,
        reactions: {},
      })

      // Update last message in chat with current time
      await updateDoc(doc(db, "chats", selectedChat), {
        lastMessage: newMessage,
        lastMessageTime: currentTime, // Ensure this is a string ISO date
      })

      // Clear typing indicator
      if (typingTimeout) {
        clearTimeout(typingTimeout)
        setTypingTimeout(null)
      }

      const typingRef = doc(db, "chats", selectedChat, "typing", "status")
      await updateDoc(typingRef, {
        [user.id]: false,
      }).catch(async (error) => {
        // If document doesn't exist, create it
        if (error.code === "not-found") {
          await setDoc(typingRef, {
            [user.id]: false,
          })
        }
      })

      setIsTyping(false)
      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const handleTyping = async () => {
    if (!selectedChat || !user || isTyping) return

    try {
      setIsTyping(true)

      // Update typing status
      const typingRef = doc(db, "chats", selectedChat, "typing", "status")
      await updateDoc(typingRef, {
        [user.id]: true,
      }).catch(async (error) => {
        // If document doesn't exist, create it
        if (error.code === "not-found") {
          await setDoc(typingRef, {
            [user.id]: true,
          })
        }
      })

      // Clear previous timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout)
      }

      // Set timeout to clear typing status
      const timeout = setTimeout(async () => {
        await updateDoc(typingRef, {
          [user.id]: false,
        }).catch(async (error) => {
          // If document doesn't exist, create it
          if (error.code === "not-found") {
            await setDoc(typingRef, {
              [user.id]: false,
            })
          }
        })
        setIsTyping(false)
      }, 3000)

      setTypingTimeout(timeout)
    } catch (error) {
      console.error("Error updating typing status:", error)
    }
  }

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center">
          <h3 className="text-lg font-medium">Select a conversation</h3>
          <p className="text-slate-500 dark:text-slate-400">Choose a conversation from the sidebar</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950">
      {otherUser && (
        <div className="p-4 border-b flex items-center">
          <Avatar>
            <AvatarImage src={otherUser.photoURL} alt={otherUser.displayName} />
            <AvatarFallback>{otherUser.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="ml-3">
            <p className="font-medium">{otherUser.displayName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{otherUser.email}</p>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                isOwnMessage={message.senderId === user?.id}
                chatId={selectedChat}
                currentUserId={user?.id || ""}
              />
            ))
          )}
          {otherUserTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value)
              handleTyping()
            }}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}