#!/bin/bash

# WebRTC Video Call Application Setup Script
# This script sets up the complete video calling application on Ubuntu 20.04

set -e

echo "🚀 Setting up WebRTC Video Call Application..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
print_status "Installing required packages..."
sudo apt install -y \
    curl \
    wget \
    git \
    nginx \
    certbot \
    python3-certbot-nginx \
    ufw \
    htop \
    unzip

# Install Docker
print_status "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    print_status "Docker installed successfully"
else
    print_status "Docker is already installed"
fi

# Install Docker Compose
print_status "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_status "Docker Compose installed successfully"
else
    print_status "Docker Compose is already installed"
fi

# Install Node.js (for local development)
print_status "Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_status "Node.js installed successfully"
else
    print_status "Node.js is already installed"
fi

# Configure firewall
print_status "Configuring firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3478/udp  # TURN server
sudo ufw allow 3478/tcp  # TURN server
sudo ufw allow 5349/tcp  # TURN server TLS
sudo ufw allow 49152:65535/udp  # TURN relay ports

print_status "Firewall configured successfully"

# Get server IP
SERVER_IP=$(curl -s ifconfig.me)
print_status "Detected server IP: $SERVER_IP"

# Create application directory
APP_DIR="/opt/videocall"
print_status "Creating application directory at $APP_DIR..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Clone or setup application (assuming code is already present)
if [ -d "/tmp/videocall-app" ]; then
    print_status "Copying application files..."
    cp -r /tmp/videocall-app/* $APP_DIR/
else
    print_warning "Application files not found in /tmp/videocall-app"
    print_status "Please copy your application files to $APP_DIR"
fi

# Create environment file
print_status "Creating environment configuration..."
cat > $APP_DIR/.env << EOF
# Server Configuration
SERVER_IP=$SERVER_IP
NODE_ENV=production

# TURN Server Configuration
NEXT_PUBLIC_TURN_SERVER=turn:$SERVER_IP:3478
NEXT_PUBLIC_TURN_USERNAME=videocall
NEXT_PUBLIC_TURN_PASSWORD=secretpassword123

# SSL Configuration (update these paths after obtaining certificates)
SSL_CERT_PATH=/etc/letsencrypt/live/your-domain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/your-domain.com/privkey.pem
EOF

# Update coturn configuration with server IP
if [ -f "$APP_DIR/coturn.conf" ]; then
    print_status "Updating coturn configuration..."
    sed -i "s/YOUR_SERVER_PUBLIC_IP/$SERVER_IP/g" $APP_DIR/coturn.conf
fi

# Create systemd service for the application
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/videocall.service > /dev/null << EOF
[Unit]
Description=WebRTC Video Call Application
After=network.target docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
User=$USER
Group=$USER

[Install]
WantedBy=multi-user.target
EOF

# Enable the service
sudo systemctl daemon-reload
sudo systemctl enable videocall.service

print_status "Setup completed successfully!"
print_warning "Next steps:"
echo "1. Update the domain name in nginx.conf and coturn.conf"
echo "2. Obtain SSL certificates: sudo certbot --nginx -d your-domain.com"
echo "3. Update the .env file with your domain and credentials"
echo "4. Start the application: sudo systemctl start videocall"
echo "5. Check status: sudo systemctl status videocall"
echo ""
print_status "Your server IP is: $SERVER_IP"
print_status "Make sure to point your domain's DNS to this IP address"
