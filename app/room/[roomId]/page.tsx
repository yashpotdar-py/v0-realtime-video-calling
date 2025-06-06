"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mic, MicOff, Video, VideoOff, Phone, Copy, Users, Wifi, WifiOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { VideoCallClient } from "@/lib/video-call-client"

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "failed"

export default function RoomPage() {
  const params = useParams()
  const roomId = params.roomId as string
  const { toast } = useToast()

  // Video refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  // WebRTC client ref
  const videoCallClientRef = useRef<VideoCallClient | null>(null)

  // State
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting")
  const [participantCount, setParticipantCount] = useState(1)
  const [hasRemoteStream, setHasRemoteStream] = useState(false)

  useEffect(() => {
    if (!roomId) return

    // Initialize video call client
    const client = new VideoCallClient(roomId)
    videoCallClientRef.current = client

    // Set up event listeners
    client.on("localStream", (stream: MediaStream) => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
    })

    client.on("remoteStream", (stream: MediaStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream
        setHasRemoteStream(true)
      }
    })

    client.on("connectionStateChange", (state: ConnectionStatus) => {
      setConnectionStatus(state)
    })

    client.on("participantJoined", () => {
      setParticipantCount((prev) => prev + 1)
      toast({
        title: "Participant joined",
        description: "Someone joined the call",
      })
    })

    client.on("participantLeft", () => {
      setParticipantCount((prev) => Math.max(1, prev - 1))
      setHasRemoteStream(false)
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null
      }
      toast({
        title: "Participant left",
        description: "Someone left the call",
      })
    })

    client.on("error", (error: string) => {
      toast({
        title: "Connection Error",
        description: error,
        variant: "destructive",
      })
      setConnectionStatus("failed")
    })

    // Initialize the call
    client.initialize().catch((error) => {
      console.error("Failed to initialize video call:", error)
      toast({
        title: "Failed to start call",
        description: "Could not access camera/microphone",
        variant: "destructive",
      })
    })

    // Cleanup on unmount
    return () => {
      client.cleanup()
    }
  }, [roomId, toast])

  const toggleAudio = () => {
    if (videoCallClientRef.current) {
      const newState = !isAudioEnabled
      videoCallClientRef.current.toggleAudio(newState)
      setIsAudioEnabled(newState)
    }
  }

  const toggleVideo = () => {
    if (videoCallClientRef.current) {
      const newState = !isVideoEnabled
      videoCallClientRef.current.toggleVideo(newState)
      setIsVideoEnabled(newState)
    }
  }

  const endCall = () => {
    if (videoCallClientRef.current) {
      videoCallClientRef.current.cleanup()
    }
    window.location.href = "/"
  }

  const copyRoomLink = () => {
    const link = `${window.location.origin}/room/${roomId}`
    navigator.clipboard.writeText(link)
    toast({
      title: "Link copied!",
      description: "Meeting link copied to clipboard",
    })
  }

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-500"
      case "connecting":
        return "bg-yellow-500"
      case "failed":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <Wifi className="h-3 w-3" />
      case "connecting":
        return <Wifi className="h-3 w-3 animate-pulse" />
      default:
        return <WifiOff className="h-3 w-3" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">Room: {roomId}</h1>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {participantCount}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <Badge className={`${getStatusColor()} text-white flex items-center gap-1`}>
              {getStatusIcon()}
              {connectionStatus}
            </Badge>
            <Button variant="outline" size="sm" onClick={copyRoomLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4">
        <div className="max-w-6xl mx-auto">
          <div
            className={`grid gap-4 h-[calc(100vh-200px)] ${
              hasRemoteStream ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
            }`}
          >
            {/* Local Video */}
            <Card className="relative overflow-hidden bg-gray-800 border-gray-700">
              <CardContent className="p-0 h-full">
                <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                <div className="absolute bottom-4 left-4">
                  <Badge variant="secondary">You</Badge>
                </div>
                {!isVideoEnabled && (
                  <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                    <VideoOff className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Remote Video */}
            {hasRemoteStream && (
              <Card className="relative overflow-hidden bg-gray-800 border-gray-700">
                <CardContent className="p-0 h-full">
                  <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute bottom-4 left-4">
                    <Badge variant="secondary">Participant</Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Waiting for participants */}
            {!hasRemoteStream && (
              <Card className="bg-gray-800 border-gray-700 border-dashed">
                <CardContent className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-300 mb-2">Waiting for others to join</h3>
                    <p className="text-gray-500">Share the room link to invite participants</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
          <Button
            variant={isAudioEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleAudio}
            className="rounded-full w-12 h-12 p-0"
          >
            {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          <Button
            variant={isVideoEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleVideo}
            className="rounded-full w-12 h-12 p-0"
          >
            {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>

          <Button variant="destructive" size="lg" onClick={endCall} className="rounded-full w-12 h-12 p-0">
            <Phone className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
