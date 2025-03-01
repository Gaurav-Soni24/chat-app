"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChatSidebar } from "@/components/chat-sidebar"
import { ChatWindow } from "@/components/chat-window"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import type { User } from "@/types"

export default function ChatPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        const userDoc = await getDoc(doc(db, "users", authUser.uid))
        if (userDoc.exists()) {
          setUser({
            id: authUser.uid,
            email: authUser.email || "",
            displayName: userDoc.data().displayName || authUser.email?.split("@")[0] || "User",
            photoURL:
              userDoc.data().photoURL ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(userDoc.data().displayName || authUser.email?.split("@")[0] || "User")}&background=random`,
          })
        }
        setLoading(false)
      } else {
        setUser(null)
        setLoading(false)
        router.push("/")
      }
    })

    return () => unsubscribe()
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <main className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <ChatSidebar user={user} selectedChat={selectedChat} setSelectedChat={setSelectedChat} />
      <ChatWindow user={user} selectedChat={selectedChat} />
    </main>
  )
}

