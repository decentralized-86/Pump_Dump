#!/bin/bash

# Create necessary directories
mkdir -p logs

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "Please update .env with your configuration"
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start Docker services
echo "Starting Docker services..."
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 5

# Check MongoDB connection
echo "Checking MongoDB connection..."
node -e "
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/pumpshie')
    .then(() => {
        console.log('MongoDB connection successful');
        process.exit(0);
    })
    .catch((err) => {
        console.error('MongoDB connection failed:', err);
        process.exit(1);
    });
"

# Check Redis connection
echo "Checking Redis connection..."
node -e "
const Redis = require('ioredis');
const redis = new Redis();
redis.ping()
    .then(() => {
        console.log('Redis connection successful');
        redis.disconnect();
        process.exit(0);
    })
    .catch((err) => {
        console.error('Redis connection failed:', err);
        process.exit(1);
    });
"

echo "Development environment setup complete!"
echo "You can now start the application with: npm run dev" 