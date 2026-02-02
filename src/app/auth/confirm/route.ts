import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  console.log('/auth/confirm hit with code:', code ? code.substring(0, 10) + '...' : 'NO CODE')
  console.log('Full URL:', request.url)
  
  if (code) {
    const callbackUrl = `${origin}/auth/callback?code=${code}`
    console.log('Redirecting to:', callbackUrl)
    return NextResponse.redirect(callbackUrl)
  }

  console.log('No code found, redirecting to login')
  return NextResponse.redirect(`${origin}/login?error=auth-failed`)
}