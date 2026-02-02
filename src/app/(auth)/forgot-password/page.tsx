"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/context/AuthContext"
import { ArrowLeft, MailCheck } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { forgotPassword } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await forgotPassword(email)
      setIsSubmitted(true)
    } catch (err) {
      console.error("Reset request failed", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {isSubmitted ? (
            <div className="flex justify-center mb-4">
              <div className="bg-blue-50 p-3 rounded-full">
                <MailCheck className="h-10 w-10 text-blue-600" />
              </div>
            </div>
          ) : null}
          
          <h2 className="text-3xl font-bold text-gray-900">
            {isSubmitted ? "Check your email" : "Reset Password"}
          </h2>
          <p className="mt-2 text-gray-600">
            {isSubmitted 
              ? `We've sent a password reset link to ${email}` 
              : "Enter your email to receive a password reset link"}
          </p>
        </div>

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="py-3"
                autoFocus
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 py-3" 
              disabled={isLoading}
            >
              {isLoading ? "Sending link..." : "Send Reset Link"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full py-3" 
              onClick={() => router.push('/login')}
            >
              Return to Login
            </Button>
            <p className="text-center text-sm text-gray-500">
              Didn't receive the email? Check your spam folder or{" "}
              <button 
                onClick={() => setIsSubmitted(false)} 
                className="text-blue-600 hover:underline"
              >
                try again
              </button>
            </p>
          </div>
        )}

        <div className="text-center pt-4">
          <button 
            onClick={() => router.push('/login')}
            className="flex items-center justify-center w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </button>
        </div>
      </div>
    </div>
  )
}