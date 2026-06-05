# Setup script for Video Summary & Auto-Notes (PowerShell)
# This script installs dependencies and builds shared packages

$ErrorActionPreference = "Stop"

Write-Host "🚀 Setting up Video Summary & Auto-Notes..." -ForegroundColor Cyan

# Check Node.js version
$nodeVersion = (node -v).Substring(1).Split('.')[0]
if ([int]$nodeVersion -lt 18) {
    Write-Host "❌ Error: Node.js 18 or higher is required" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js version check passed" -ForegroundColor Green

# Install root dependencies
Write-Host "📦 Installing root dependencies..." -ForegroundColor Cyan
npm install

# Build shared packages in order
Write-Host "🔨 Building shared packages..." -ForegroundColor Cyan
npm run build --workspace=packages/shared-types
npm run build --workspace=packages/validation
npm run build --workspace=packages/api-client

Write-Host "✅ Shared packages built successfully" -ForegroundColor Green

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "⚠️  Warning: .env file not found" -ForegroundColor Yellow
    Write-Host "📝 Creating .env from .env.example..." -ForegroundColor Cyan
    Copy-Item .env.example .env
    Write-Host "⚠️  Please edit .env with your credentials" -ForegroundColor Yellow
}

Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Edit .env with your MongoDB URI and Gemini API key"
Write-Host "  2. Run 'npm run dev' to start the desktop app"
Write-Host "  3. Run 'npm run server:dev' to start the backend server"
