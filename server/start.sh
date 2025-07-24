#!/bin/bash

echo "🚀 Starting CJS API Server..."
echo "📦 Installing dependencies..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    npm install
fi

echo "🔥 Starting server on port 3001..."
npm start