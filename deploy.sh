#!/bin/bash

# TurkAmerica Deployment Script
# Usage: ./deploy.sh

# Stop on error
set -e

echo "🚀 Starting deployment..."

# 1. Pull latest changes (Force Reset to avoid conflicts)
echo "📥 Pulling latest code..."
git fetch origin master
git reset --hard origin/master

# Load NVM (Node Version Manager) if it exists, because SSH non-interactive shells might not have 'npm' in PATH
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 2. Install dependencies (only production)
echo "📦 Installing dependencies..."
npm ci --only=production

# 3. Build Frontend (Eleventy + Tailwind)
echo "🏗️  Building frontend..."
# Ensure devDependencies are available for build if needed, or if npm ci removed them
# If build tools are in devDependencies, we might need 'npm install' instead of 'npm ci --production'
# Checking package.json... Tailwind and Eleventy are in devDependencies.
# So we need full install for build phase.
npm install
npm run build

# 4. Restart Server with PM2
echo "🔄 Reloading PM2..."
# Check if app is running, if so reload, else start
if pm2 list | grep -q "chinostandards"; then
    pm2 reload chinostandards
else
    npm run start:prod
fi

echo "✅ Deployment complete!"
