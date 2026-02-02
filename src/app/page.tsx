"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/context/AuthContext"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/landing")
  }, [router])

  return null
}