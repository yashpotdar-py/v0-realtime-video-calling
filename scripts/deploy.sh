#!/bin/bash

# Deployment script for WebRTC Video Call Application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[DEPLOY]${NC} $1"
}

# Configuration
APP_DIR="/opt/videocall"
DOMAIN=${1:-"your-domain.com"}

print_header "Deploying WebRTC Video Call Application"
print_status "Domain: $DOMAIN"
print_status "Application directory: $APP_DIR"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Check if application directory exists
if [ ! -d "$APP_DIR" ]; then
    print_error "Application directory $APP_DIR does not exist"
    print_status "Please run the setup script first"
    exit 1
fi

cd $APP_DIR

# Update domain in configuration files
print_status "Updating domain configuration..."

# Update nginx.conf
if [ -f "nginx.conf" ]; then
    sed -i "s/your-domain.com/$DOMAIN/g" nginx.conf
    print_status "Updated nginx.conf with domain: $DOMAIN"
fi

# Update coturn.conf
if [ -f "coturn.conf" ]; then
    sed -i "s/videocall.example.com/$DOMAIN/g" coturn.conf
    print_status "Updated coturn.conf with domain: $DOMAIN"
fi

# Build Docker images
print_status "Building Docker images..."
docker-compose build --no-cache

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose down || true

# Start the application
print_status "Starting application containers..."
docker-compose up -d

# Wait for containers to start
print_status "Waiting for containers to start..."
sleep 10

# Check container status
print_status "Checking container status..."
docker-compose ps

# Test if containers are running
if docker-compose ps | grep -q "Up"; then
    print_status "Containers are running successfully!"
else
    print_error "Some containers failed to start"
    docker-compose logs
    exit 1
fi

# Setup SSL certificates with Let's Encrypt
print_status "Setting up SSL certificates..."
if command -v certbot &> /dev/null; then
    print_warning "About to request SSL certificate for $DOMAIN"
    print_warning "Make sure your domain DNS points to this server!"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Stop nginx temporarily
        docker-compose stop nginx
        
        # Request certificate
        sudo certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN --agree-tos --no-eff-email
        
        # Create SSL directory for Docker
        sudo mkdir -p $APP_DIR/ssl
        sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $APP_DIR/ssl/
        sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $APP_DIR/ssl/
        sudo chown -R $USER:$USER $APP_DIR/ssl
        
        # Restart nginx with SSL
        docker-compose up -d nginx
        
        print_status "SSL certificates installed successfully!"
    else
        print_warning "Skipping SSL certificate setup"
    fi
else
    print_warning "Certbot not found, skipping SSL setup"
fi

# Setup automatic certificate renewal
print_status "Setting up automatic certificate renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --deploy-hook 'cd $APP_DIR && docker-compose restart nginx'") | crontab -

# Display final status
print_header "Deployment Summary"
echo "=================================="
print_status "Application URL: https://$DOMAIN"
print_status "Application directory: $APP_DIR"
print_status "Docker containers:"
docker-compose ps

echo ""
print_status "Useful commands:"
echo "  View logs: cd $APP_DIR && docker-compose logs -f"
echo "  Restart: cd $APP_DIR && docker-compose restart"
echo "  Stop: cd $APP_DIR && docker-compose down"
echo "  Update: cd $APP_DIR && docker-compose pull && docker-compose up -d"

echo ""
print_status "Monitoring:"
echo "  Container status: docker-compose ps"
echo "  System resources: htop"
echo "  Nginx logs: docker-compose logs nginx"
echo "  App logs: docker-compose logs videocall-app"
echo "  TURN logs: docker-compose logs coturn"

print_header "Deployment completed successfully! 🎉"
print_status "Your video calling application is now running at: https://$DOMAIN"
