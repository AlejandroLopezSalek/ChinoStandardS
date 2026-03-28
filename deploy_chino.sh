#!/bin/bash

# TurkAmerica Deployment Script (Optimized for 1GB RAM)
# Usage: ./deploy.sh

set -e

echo "🚀 Starting deployment..."

# 0. Optimization: Limit Node Memory for Build
# This prevents OOM (Out Of Memory) crashes during Tailwind/Eleventy builds
export NODE_OPTIONS="--max-old-space-size=512"

# 1. Pull latest changes
echo "📥 Pulling latest code..."
git fetch origin master
git reset --hard origin/main

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 2. Install dependencies (Full install needed for build tools)
echo "📦 Installing dependencies..."
# We use 'npm install' because build tools (Tailwind, 11ty) are devDependencies
npm install

# 3. Build Frontend (Eleventy + Tailwind)
echo "🏗️  Building frontend..."
npm run build

# 4. Cleanup: Remove devDependencies to save disk/RAM at runtime
# (Optional, but recommended for clean environments)
# echo "🧹 Cleaning up development dependencies..."
# npm prune --production

# 5. Restart Server with PM2
echo "🔄 Reloading PM2..."
if pm2 list | grep -q "chinostandards"; then
    pm2 reload chinostandards
else
    # First time start
    npm run start:prod
fi

echo "✅ Deployment complete!"
