"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input" 
import { Eye, EyeOff, Mail } from "lucide-react"
import { createClient } from "@/utils/supabase/client"

function LoginContent() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('') 
  
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const supabase = createClient()

  useEffect(() => {
    const urlError = searchParams.get('error')
    if (urlError) {
      setError(decodeURIComponent(urlError).replace(/_/g, ' '))
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('') 

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  const handleMagicLink = async () => {
    if (!email) {
      setError("Please enter your email first")
      return
    }

    setIsMagicLinkLoading(true)
    setError('')

    const { error: magicLinkError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })

    if (magicLinkError) {
      setError(magicLinkError.message)
      setIsMagicLinkLoading(false)
    } else {
      router.push("/check-email")
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Login</h2>
            <p className="mt-2 text-gray-600">Choose your preferred login method</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="py-3"
                />
              </div>

              <Button 
                type="button"
                variant="outline"
                className="w-full py-3 flex items-center justify-center gap-2 border-gray-300 hover:bg-gray-50"
                onClick={handleMagicLink}
                disabled={isMagicLinkLoading || isLoading}
              >
                <Mail className="h-4 w-4" />
                {isMagicLinkLoading ? "Sending Link..." : "Sign in with Magic Link"}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or use password</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="py-3 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    variant="link" 
                    className="px-0 font-normal text-sm text-blue-600 h-auto"
                    onClick={() => router.push('/forgot-password')}
                    type="button"
                  >
                    Forgot password?
                  </Button>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 py-3 text-white" 
                  disabled={isLoading || isMagicLinkLoading}
                >
                  {isLoading ? "Logging in..." : "Login with Password"}
                </Button>
              </form>
            </div>

            {error && (
              <div className="p-3 rounded bg-red-50 border border-red-200">
                <p className="text-center text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="text-center">
              <Button variant="ghost" className="text-gray-600" onClick={() => router.push('/signup')}>
                Don't have an account? Signup
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}