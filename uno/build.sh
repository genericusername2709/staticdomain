#!/bin/bash

# 1. Get the absolute path of the directory where this script lives
# This ensures the script works regardless of where you call it from.
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Define our paths based on the script location
DEV_DIR="$PROJECT_ROOT/dev"
ASSETS_DIR="$PROJECT_ROOT/assets"

echo "🚀 Starting build process in $DEV_DIR..."

# 2. Move into the dev directory
cd "$DEV_DIR" || { echo "❌ Error: Could not find dev directory"; exit 1; }

# 3. Run the build
echo "📦 Running npm build..."
npm run build || { echo "❌ Error: Build failed"; exit 1; }

# 4. Clean up the assets folder
echo "🧹 Cleaning up old assets..."
rm -rf "$ASSETS_DIR"/*

# 5. Copy new build files to the root
# Using -r for recursive and -v if you want to see what's happening
echo "🚚 Copying dist to project root..."
cp -r "$DEV_DIR/dist/"* "$PROJECT_ROOT/"

echo "✅ Done! Your project is updated."