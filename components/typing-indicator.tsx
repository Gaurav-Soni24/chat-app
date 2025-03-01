export function TypingIndicator() {
  return (
    <div className="flex items-center space-x-2">
      <div className="flex space-x-1">
        <div className="h-2 w-2 rounded-full bg-green-500 dark:bg-green-700 animate-bounce [animation-delay:-0.3s]"></div>
        <div className="h-2 w-2 rounded-full bg-green-500 dark:bg-green-700 animate-bounce [animation-delay:-0.15s]"></div>
        <div className="h-2 w-2 rounded-full bg-green-500 dark:bg-green-700 animate-bounce"></div>
      </div>
      <span className="text-xs text-green-600 dark:text-green-800">typing...</span>
    </div>
  )
}

