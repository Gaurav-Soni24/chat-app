"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Smile, Check, CheckCheck } from "lucide-react"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Message } from "@/types"

interface MessageItemProps {
  message: Message
  isOwnMessage: boolean
  chatId: string
  currentUserId: string
}

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"]

export function MessageItem({ message, isOwnMessage, chatId, currentUserId }: MessageItemProps) {
  const [showReactions, setShowReactions] = useState(false)

  const handleReaction = async (reaction: string) => {
    try {
      const messageRef = doc(db, "chats", chatId, "messages", message.id)
      const messageDoc = await getDoc(messageRef)

      if (messageDoc.exists()) {
        const reactions = messageDoc.data().reactions || {}

        // Toggle reaction
        if (reactions[currentUserId] === reaction) {
          delete reactions[currentUserId]
        } else {
          reactions[currentUserId] = reaction
        }

        await updateDoc(messageRef, { reactions })
      }

      setShowReactions(false)
    } catch (error) {
      console.error("Error adding reaction:", error)
    }
  }

  // Count reactions
  const reactionCounts: Record<string, number> = {}
  const userReaction = message.reactions?.[currentUserId]

  Object.values(message.reactions || {}).forEach((reaction) => {
    reactionCounts[reaction] = (reactionCounts[reaction] || 0) + 1
  })

  return (
    <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[70%] ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}>
        {!isOwnMessage && (
          <Avatar className="h-8 w-8 mr-2">
            <AvatarImage src="/placeholder-user.jpg" alt="User" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        )}

        <div className="space-y-1">
          <div className={`relative group ${isOwnMessage ? "text-right" : "text-left"}`}>
            <div
              className={`px-4 py-2 rounded-lg ${
                isOwnMessage ? "bg-primary text-primary-foreground" : "bg-slate-200 dark:bg-slate-800"
              }`}
            >
              {message.text}

              {/* Read receipts */}
              {isOwnMessage && (
                <span className="ml-2 inline-flex text-xs opacity-70">
                  {message.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                </span>
              )}
            </div>

            {/* Reaction button */}
            <Popover open={showReactions} onOpenChange={setShowReactions}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-6 w-6 rounded-full absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity ${
                    isOwnMessage ? "-left-7" : "-right-7"
                  }`}
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align={isOwnMessage ? "start" : "end"}>
                <div className="flex space-x-2">
                  {REACTIONS.map((reaction) => (
                    <button
                      key={reaction}
                      className={`text-xl hover:scale-125 transition ${userReaction === reaction ? "scale-125" : ""}`}
                      onClick={() => handleReaction(reaction)}
                    >
                      {reaction}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Display reactions */}
          {Object.keys(reactionCounts).length > 0 && (
            <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5 text-xs flex items-center">
                {Object.entries(reactionCounts).map(([reaction, count], index) => (
                  <span key={index} className="flex items-center">
                    {index > 0 && <span className="mx-0.5">·</span>}
                    <span>{reaction}</span>
                    {count > 1 && <span className="ml-0.5">{count}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className={`text-xs text-slate-500 dark:text-slate-400 ${isOwnMessage ? "text-right" : "text-left"}`}>
            {message.timestamp
              ? new Date(message.timestamp.toDate()).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Sending..."}
          </div>
        </div>
      </div>
    </div>
  )
}

