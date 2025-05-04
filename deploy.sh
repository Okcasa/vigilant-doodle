#!/bin/bash

# Create logs directory
mkdir -p logs

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please create a .env file with your API key and other environment variables."
    exit 1
fi

# Install PM2 globally if not already installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Pull latest changes from GitHub
echo "Pulling latest changes from GitHub..."
git pull origin main

# Install dependencies
echo "Installing dependencies..."
npm install

# Start or restart the application with PM2
echo "Starting application with PM2..."
pm2 startOrRestart ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup

echo "Deployment completed successfully!"
echo "You can check the logs using: pm2 logs backend"
echo "You can monitor the application using: pm2 monit" 