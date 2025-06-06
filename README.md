# WebRTC Video Call Application

A production-ready, real-time video calling web application built with Next.js, WebRTC, and Socket.IO. This application provides secure peer-to-peer video communication with unique meeting links and full TURN server support for NAT traversal.

## 🚀 Features

- **Real-time Video Calling**: Peer-to-peer video and audio communication using WebRTC
- **Unique Meeting Links**: Generate UUID-based room URLs for easy sharing
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Audio/Video Controls**: Mute/unmute audio and start/stop video functionality
- **Connection Status**: Real-time connection status indicators
- **TURN Server Support**: Includes coturn configuration for NAT/firewall traversal
- **Production Ready**: Complete Docker deployment with HTTPS support
- **Scalable Architecture**: Built with Next.js and Socket.IO for optimal performance

## 🏗️ Architecture

\`\`\`
┌─────────────────┐    ┌─────────────────┐
│   Client A      │    │   Client B      │
│   (Browser)     │    │   (Browser)     │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          │   WebRTC P2P         │
          │ ◄─────────────────► │
          │                      │
          │                      │
          ▼                      ▼
┌─────────────────────────────────────────┐
│         Signaling Server                │
│      (Next.js + Socket.IO)              │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│           TURN Server                   │
│           (coturn)                      │
└─────────────────────────────────────────┘
\`\`\`

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Socket.IO
- **WebRTC**: Native WebRTC APIs with STUN/TURN support
- **Signaling**: WebSocket-based signaling via Socket.IO
- **TURN Server**: coturn for NAT traversal
- **Deployment**: Docker, Docker Compose, Nginx
- **SSL**: Let's Encrypt with automatic renewal

## 📋 Prerequisites

- **Server**: Ubuntu 20.04 LTS (or similar Linux distribution)
- **Node.js**: Version 18.x or higher
- **Docker**: Latest version with Docker Compose
- **Domain**: A registered domain name pointing to your server
- **Ports**: 80, 443, 3478 (UDP/TCP), 5349 (TCP), 49152-65535 (UDP)

## 🚀 Quick Start

### 1. Clone and Setup

\`\`\`bash
# Clone the repository
git clone <repository-url>
cd webrtc-video-call

# Run the setup script
chmod +x scripts/setup.sh
./scripts/setup.sh
\`\`\`

### 2. Configure Domain

\`\`\`bash
# Update your domain name
export DOMAIN="your-domain.com"

# Deploy the application
chmod +x scripts/deploy.sh
./scripts/deploy.sh $DOMAIN
\`\`\`

### 3. Access Your Application

Visit `https://your-domain.com` to start using your video calling application!

## 🔧 Manual Installation

### Step 1: System Setup

\`\`\`bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx ufw

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
\`\`\`

### Step 2: Configure Firewall

\`\`\`bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3478/udp
sudo ufw allow 3478/tcp
sudo ufw allow 5349/tcp
sudo ufw allow 49152:65535/udp
\`\`\`

### Step 3: Application Setup

\`\`\`bash
# Create application directory
sudo mkdir -p /opt/videocall
sudo chown $USER:$USER /opt/videocall
cd /opt/videocall

# Copy application files
cp -r /path/to/your/app/* .

# Create environment file
cat > .env << EOF
SERVER_IP=$(curl -s ifconfig.me)
NODE_ENV=production
NEXT_PUBLIC_TURN_SERVER=turn:$(curl -s ifconfig.me):3478
NEXT_PUBLIC_TURN_USERNAME=videocall
NEXT_PUBLIC_TURN_PASSWORD=your-secure-password
EOF
\`\`\`

### Step 4: Update Configuration

\`\`\`bash
# Update domain in nginx.conf
sed -i 's/your-domain.com/yourdomain.com/g' nginx.conf

# Update domain in coturn.conf
sed -i 's/videocall.example.com/yourdomain.com/g' coturn.conf
sed -i "s/YOUR_SERVER_PUBLIC_IP/$(curl -s ifconfig.me)/g" coturn.conf
\`\`\`

### Step 5: Deploy with Docker

\`\`\`bash
# Build and start containers
docker-compose build
docker-compose up -d

# Check status
docker-compose ps
\`\`\`

### Step 6: Setup SSL

\`\`\`bash
# Stop nginx temporarily
docker-compose stop nginx

# Get SSL certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates for Docker
sudo mkdir -p ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/
sudo chown -R $USER:$USER ssl

# Restart with SSL
docker-compose up -d
\`\`\`

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

\`\`\`env
# Server Configuration
SERVER_IP=your.server.ip
NODE_ENV=production

# TURN Server Configuration
NEXT_PUBLIC_TURN_SERVER=turn:your.server.ip:3478
NEXT_PUBLIC_TURN_USERNAME=videocall
NEXT_PUBLIC_TURN_PASSWORD=your-secure-password

# SSL Configuration
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
\`\`\`

### TURN Server Configuration

The `coturn.conf` file contains the TURN server configuration. Key settings:

\`\`\`conf
# Listening ports
listening-port=3478
tls-listening-port=5349

# Server IPs (update these)
listening-ip=0.0.0.0
external-ip=YOUR_SERVER_PUBLIC_IP
relay-ip=0.0.0.0

# Authentication
realm=yourdomain.com
user=videocall:your-secure-password

# Security settings
fingerprint
lt-cred-mech
\`\`\`

## 🧪 Testing

### Local Testing

1. Open two browser tabs/windows
2. Navigate to your application URL
3. Click "Start New Meeting" in the first tab
4. Copy the room URL and paste it in the second tab
5. Both clients should connect and see each other's video

### Production Testing

1. Test from different networks/devices
2. Verify TURN server functionality with clients behind NAT
3. Check SSL certificate validity
4. Monitor server resources and logs

## 📊 Monitoring

### Container Logs

\`\`\`bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f videocall-app
docker-compose logs -f coturn
docker-compose logs -f nginx
\`\`\`

### System Monitoring

\`\`\`bash
# Container status
docker-compose ps

# System resources
htop

# Network connections
netstat -tulpn | grep -E '(3478|443|80)'

# TURN server status
docker-compose exec coturn turnutils_uclient -T -u videocall -w your-password your.server.ip
\`\`\`

## 🔒 Security Considerations

### TURN Server Security

1. **Change Default Credentials**: Update the TURN server username/password
2. **Restrict IP Ranges**: Configure allowed/denied peer IPs in coturn.conf
3. **Enable TLS**: Use TLS for TURN server communication
4. **Firewall Rules**: Limit access to necessary ports only

### Application Security

1. **HTTPS Only**: Enforce HTTPS for all connections
2. **Rate Limiting**: Nginx configuration includes rate limiting
3. **Security Headers**: Proper security headers are configured
4. **Regular Updates**: Keep all dependencies updated

## 🚀 Scaling

### Horizontal Scaling

For high-traffic deployments:

1. **Load Balancer**: Use a load balancer for multiple app instances
2. **Redis**: Add Redis for Socket.IO session sharing
3. **Multiple TURN Servers**: Deploy TURN servers in different regions
4. **CDN**: Use a CDN for static assets

### Vertical Scaling

- Increase server resources (CPU, RAM, bandwidth)
- Optimize Docker container resource limits
- Tune TURN server parameters for higher concurrent users

## 🛠️ Troubleshooting

### Common Issues

#### WebRTC Connection Fails
\`\`\`bash
# Check TURN server
docker-compose logs coturn

# Test TURN server
docker-compose exec coturn turnutils_uclient -T -u videocall -w your-password your.server.ip
\`\`\`

#### Socket.IO Connection Issues
\`\`\`bash
#
