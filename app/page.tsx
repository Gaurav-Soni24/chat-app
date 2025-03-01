import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { AuthForm } from "@/components/auth-form"

export default function Home() {
  const cookieStore = cookies()
  const userCookie = cookieStore.get("user-session")

  if (userCookie) {
    redirect("/chat")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">ChatWave</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Real-time messaging with reactions and more</p>
        </div>
        <AuthForm />
      </div>
    </main>
  )
}

