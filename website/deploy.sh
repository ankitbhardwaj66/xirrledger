#!/bin/bash

# XIRR Ledger Website Deployment Script
# This script builds the website and deploys it to Hostinger's public_html directory
# Usage: ./deploy.sh

set -e  # Exit on any error

echo "🚀 Starting deployment process..."
echo ""

# Build the website
echo "📦 Building website..."
npm run build

# Check if build was successful
if [ ! -d "out" ]; then
    echo "❌ Error: Build failed - 'out' directory not found"
    exit 1
fi

echo "✅ Build completed successfully"
echo ""

# Define target directory (public_html)
TARGET_DIR="../../"

# Create target directory if it doesn't exist
if [ ! -d "$TARGET_DIR" ]; then
    echo "📁 Creating target directory: $TARGET_DIR"
    mkdir -p "$TARGET_DIR"
fi

# Backup existing files (optional - uncomment if needed)
# TIMESTAMP=$(date +%Y%m%d_%H%M%S)
# if [ -d "$TARGET_DIR/index.html" ]; then
#     echo "💾 Creating backup..."
#     mkdir -p "$TARGET_DIR/.backups"
#     cp -r "$TARGET_DIR"/* "$TARGET_DIR/.backups/backup_$TIMESTAMP/" 2>/dev/null || true
# fi

# Remove old files from target directory (except hidden files and specific directories)
echo "🧹 Cleaning target directory..."
find "$TARGET_DIR" -maxdepth 1 -not -name ".*" -not -name "xirrcalculator" -not -path "$TARGET_DIR" -exec rm -rf {} + 2>/dev/null || true

# Copy new files to target directory
echo "📂 Copying files to $TARGET_DIR..."
cp -r out/* "$TARGET_DIR"

# Set proper permissions (if needed for Hostinger)
echo "🔐 Setting permissions..."
find "$TARGET_DIR" -type f -exec chmod 644 {} \;
find "$TARGET_DIR" -type d -exec chmod 755 {} \;

echo ""
echo "✅ Deployment completed successfully!"
echo "🌐 Website is now live at your domain"
echo ""
echo "📋 Deployment summary:"
echo "   Source: ./out/"
echo "   Target: $TARGET_DIR"
echo "   Files deployed: $(find out -type f | wc -l | tr -d ' ')"
echo ""
