"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Video, Users, ArrowRight } from "lucide-react"

export default function HomePage() {
  const [roomId, setRoomId] = useState("")
  const router = useRouter()

  const startNewMeeting = () => {
    // Generate a cryptographically strong UUID
    const uuid = crypto.randomUUID()
    router.push(`/room/${uuid}`)
  }

  const joinMeeting = () => {
    if (roomId.trim()) {
      router.push(`/room/${roomId.trim()}`)
    }
  }

  const handleRoomIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRoomId(e.target.value)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      joinMeeting()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Video className="mx-auto h-12 w-12 text-blue-600 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">VideoCall</h1>
          <p className="text-gray-600">Secure peer-to-peer video calling</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Start a Meeting
            </CardTitle>
            <CardDescription>Create a new video call room and invite others</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={startNewMeeting} className="w-full" size="lg">
              Start New Meeting
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Join a Meeting</CardTitle>
            <CardDescription>Enter a room ID or paste a meeting link</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="text"
              placeholder="Enter room ID or paste meeting link"
              value={roomId}
              onChange={handleRoomIdChange}
              onKeyPress={handleKeyPress}
            />
            <Button onClick={joinMeeting} variant="outline" className="w-full" disabled={!roomId.trim()}>
              Join Meeting
            </Button>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500">
          <p>Built with WebRTC for secure peer-to-peer communication</p>
        </div>
      </div>
    </div>
  )
}
