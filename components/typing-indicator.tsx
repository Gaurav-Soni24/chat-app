export function TypingIndicator() {
  return (
    <div className="flex items-center space-x-2">
      <div className="flex space-x-1">
        <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce [animation-delay:-0.3s]"></div>
        <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce [animation-delay:-0.15s]"></div>
        <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce"></div>
      </div>
      <span className="text-xs text-slate-500 dark:text-slate-400">Someone is typing...</span>
    </div>
  )
}

