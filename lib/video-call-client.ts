import { io, type Socket } from "socket.io-client"

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "failed"

export class VideoCallClient {
  private socket: Socket
  private peerConnection: RTCPeerConnection
  private localStream: MediaStream | null = null
  private roomId: string
  private clientId: string
  private eventListeners: Map<string, Function[]> = new Map()

  // ICE servers configuration with STUN and TURN
  private iceServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    // TURN server will be added via environment variables
    ...(process.env.NEXT_PUBLIC_TURN_SERVER
      ? [
          {
            urls: process.env.NEXT_PUBLIC_TURN_SERVER,
            username: process.env.NEXT_PUBLIC_TURN_USERNAME || "",
            credential: process.env.NEXT_PUBLIC_TURN_PASSWORD || "",
          },
        ]
      : []),
  ]

  constructor(roomId: string) {
    this.roomId = roomId
    this.clientId = crypto.randomUUID()

    // Initialize Socket.IO connection
    this.socket = io({
      path: "/api/socket",
    })

    // Initialize WebRTC peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10,
    })

    this.setupSocketListeners()
    this.setupPeerConnectionListeners()
  }

  private setupSocketListeners() {
    this.socket.on("connect", () => {
      console.log("Connected to signaling server")
      this.socket.emit("join-room", { roomId: this.roomId, clientId: this.clientId })
    })

    this.socket.on("participant-joined", async (data: { clientId: string }) => {
      if (data.clientId !== this.clientId) {
        console.log("New participant joined, creating offer")
        await this.createOffer()
        this.emit("participantJoined")
      }
    })

    this.socket.on("participant-left", (data: { clientId: string }) => {
      if (data.clientId !== this.clientId) {
        console.log("Participant left")
        this.emit("participantLeft")
      }
    })

    this.socket.on("offer", async (data: { offer: RTCSessionDescriptionInit; from: string }) => {
      if (data.from !== this.clientId) {
        console.log("Received offer")
        await this.handleOffer(data.offer, data.from)
      }
    })

    this.socket.on("answer", async (data: { answer: RTCSessionDescriptionInit; from: string }) => {
      if (data.from !== this.clientId) {
        console.log("Received answer")
        await this.handleAnswer(data.answer)
      }
    })

    this.socket.on("ice-candidate", async (data: { candidate: RTCIceCandidateInit; from: string }) => {
      if (data.from !== this.clientId) {
        console.log("Received ICE candidate")
        await this.handleIceCandidate(data.candidate)
      }
    })

    this.socket.on("disconnect", () => {
      console.log("Disconnected from signaling server")
      this.emit("connectionStateChange", "disconnected")
    })
  }

  private setupPeerConnectionListeners() {
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate")
        this.socket.emit("ice-candidate", {
          roomId: this.roomId,
          candidate: event.candidate.toJSON(),
          from: this.clientId,
        })
      }
    }

    this.peerConnection.ontrack = (event) => {
      console.log("Received remote stream")
      const [remoteStream] = event.streams
      this.emit("remoteStream", remoteStream)
    }

    this.peerConnection.onconnectionstatechange = () => {
      console.log("Connection state:", this.peerConnection.connectionState)
      const state = this.peerConnection.connectionState

      if (state === "connected") {
        this.emit("connectionStateChange", "connected")
      } else if (state === "failed" || state === "disconnected") {
        this.emit("connectionStateChange", "failed")
      } else if (state === "connecting") {
        this.emit("connectionStateChange", "connecting")
      }
    }

    this.peerConnection.onicegatheringstatechange = () => {
      console.log("ICE gathering state:", this.peerConnection.iceGatheringState)
    }
  }

  async initialize() {
    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      // Add local stream to peer connection
      this.localStream.getTracks().forEach((track) => {
        if (this.localStream) {
          this.peerConnection.addTrack(track, this.localStream)
        }
      })

      this.emit("localStream", this.localStream)
      this.emit("connectionStateChange", "connecting")
    } catch (error) {
      console.error("Error accessing media devices:", error)
      this.emit("error", "Could not access camera/microphone. Please check permissions.")
      throw error
    }
  }

  private async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      })

      await this.peerConnection.setLocalDescription(offer)

      this.socket.emit("offer", {
        roomId: this.roomId,
        offer: offer,
        from: this.clientId,
      })
    } catch (error) {
      console.error("Error creating offer:", error)
      this.emit("error", "Failed to create connection offer")
    }
  }

  private async handleOffer(offer: RTCSessionDescriptionInit, from: string) {
    try {
      await this.peerConnection.setRemoteDescription(offer)

      const answer = await this.peerConnection.createAnswer()
      await this.peerConnection.setLocalDescription(answer)

      this.socket.emit("answer", {
        roomId: this.roomId,
        answer: answer,
        from: this.clientId,
        to: from,
      })
    } catch (error) {
      console.error("Error handling offer:", error)
      this.emit("error", "Failed to handle connection offer")
    }
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit) {
    try {
      await this.peerConnection.setRemoteDescription(answer)
    } catch (error) {
      console.error("Error handling answer:", error)
      this.emit("error", "Failed to handle connection answer")
    }
  }

  private async handleIceCandidate(candidate: RTCIceCandidateInit) {
    try {
      await this.peerConnection.addIceCandidate(candidate)
    } catch (error) {
      console.error("Error handling ICE candidate:", error)
    }
  }

  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = enabled
      }
    }
  }

  toggleVideo(enabled: boolean) {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = enabled
      }
    }
  }

  cleanup() {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop())
    }

    // Close peer connection
    this.peerConnection.close()

    // Disconnect socket
    this.socket.disconnect()

    // Clear event listeners
    this.eventListeners.clear()
  }

  // Event emitter methods
  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  private emit(event: string, data?: any) {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach((callback) => callback(data))
    }
  }
}
