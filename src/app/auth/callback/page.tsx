'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient()
      
      try {
        console.log('Checking for session...')
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setError(sessionError.message)
          setTimeout(() => router.push('/login?error=auth-failed'), 2000)
          return
        }

        if (session) {
          console.log('Session found -', session.user.email)
          
          await new Promise(resolve => setTimeout(resolve, 500))
          
          router.push('/dashboard')
          router.refresh()
        } else {
          console.log('No session found, waiting...')
          
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          const { data: { session: retrySession } } = await supabase.auth.getSession()
          
          if (retrySession) {
            console.log('Session found on retry -', retrySession.user.email)
            router.push('/dashboard')
            router.refresh()
          } else {
            console.error('Still no session after retry')
            setError('Could not establish session')
            setTimeout(() => router.push('/login?error=no-session'), 2000)
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('An unexpected error occurred')
        setTimeout(() => router.push('/login?error=auth-failed'), 2000)
      }
    }

    handleCallback()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Authentication Error</h2>
          <p className="text-gray-600">{error}</p>
          <p className="text-sm text-gray-500 mt-2">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-800">Completing sign in...</h2>
        <p className="text-gray-600 mt-2">Please wait a moment...</p>
      </div>
    </div>
  )
}