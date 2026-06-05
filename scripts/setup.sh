#!/bin/bash

# Setup script for Video Summary & Auto-Notes
# This script installs dependencies and builds shared packages

set -e

echo "🚀 Setting up Video Summary & Auto-Notes..."

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Error: Node.js 18 or higher is required"
  exit 1
fi

echo "✅ Node.js version check passed"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Build shared packages in order
echo "🔨 Building shared packages..."
npm run build --workspace=packages/shared-types
npm run build --workspace=packages/validation
npm run build --workspace=packages/api-client

echo "✅ Shared packages built successfully"

# Check if .env exists
if [ ! -f .env ]; then
  echo "⚠️  Warning: .env file not found"
  echo "📝 Creating .env from .env.example..."
  cp .env.example .env
  echo "⚠️  Please edit .env with your credentials"
fi

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your MongoDB URI and Gemini API key"
echo "  2. Run 'npm run dev' to start the desktop app"
echo "  3. Run 'npm run server:dev' to start the backend server"
