import type { NextRequest } from "next/server"
import { Server as SocketIOServer } from "socket.io"
import { Server as HTTPServer } from "http"

// Global socket server instance
let io: SocketIOServer

// Room management
const rooms = new Map<string, Set<string>>()

export async function GET(req: NextRequest) {
  if (!io) {
    console.log("Initializing Socket.IO server...")

    // Create HTTP server for Socket.IO
    const httpServer = new HTTPServer()

    io = new SocketIOServer(httpServer, {
      path: "/api/socket",
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
      transports: ["websocket", "polling"],
    })

    io.on("connection", (socket) => {
      console.log("Client connected:", socket.id)

      // Handle room joining
      socket.on("join-room", (data: { roomId: string; clientId: string }) => {
        const { roomId, clientId } = data
        console.log(`Client ${clientId} joining room ${roomId}`)

        // Join the socket room
        socket.join(roomId)

        // Add to room tracking
        if (!rooms.has(roomId)) {
          rooms.set(roomId, new Set())
        }
        rooms.get(roomId)!.add(clientId)

        // Notify others in the room
        socket.to(roomId).emit("participant-joined", { clientId })

        console.log(`Room ${roomId} now has ${rooms.get(roomId)!.size} participants`)
      })

      // Handle WebRTC signaling
      socket.on("offer", (data: { roomId: string; offer: RTCSessionDescriptionInit; from: string }) => {
        console.log(`Relaying offer from ${data.from} in room ${data.roomId}`)
        socket.to(data.roomId).emit("offer", {
          offer: data.offer,
          from: data.from,
        })
      })

      socket.on("answer", (data: { roomId: string; answer: RTCSessionDescriptionInit; from: string; to?: string }) => {
        console.log(`Relaying answer from ${data.from} in room ${data.roomId}`)
        if (data.to) {
          // Send to specific client if specified
          socket.to(data.roomId).emit("answer", {
            answer: data.answer,
            from: data.from,
          })
        } else {
          // Broadcast to room
          socket.to(data.roomId).emit("answer", {
            answer: data.answer,
            from: data.from,
          })
        }
      })

      socket.on("ice-candidate", (data: { roomId: string; candidate: RTCIceCandidateInit; from: string }) => {
        console.log(`Relaying ICE candidate from ${data.from} in room ${data.roomId}`)
        socket.to(data.roomId).emit("ice-candidate", {
          candidate: data.candidate,
          from: data.from,
        })
      })

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id)

        // Find and remove client from rooms
        for (const [roomId, clients] of rooms.entries()) {
          // Note: In a production app, you'd want to track socket.id to clientId mapping
          // For now, we'll just notify the room that someone left
          socket.to(roomId).emit("participant-left", { clientId: socket.id })

          // Clean up empty rooms
          if (clients.size === 0) {
            rooms.delete(roomId)
          }
        }
      })
    })

    // Start the HTTP server on a different port for Socket.IO
    const port = process.env.SOCKET_PORT || 3001
    httpServer.listen(port, () => {
      console.log(`Socket.IO server running on port ${port}`)
    })
  }

  return new Response("Socket.IO server initialized", { status: 200 })
}
