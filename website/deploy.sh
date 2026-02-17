#!/bin/bash

# XIRR Ledger Website Deployment Script
# This script deploys pre-built website files to Hostinger's public_html directory
# Usage: ./deploy.sh
# Note: Run 'npm run build' locally before deploying

set -e  # Exit on any error

echo "🚀 Starting deployment process..."
echo ""

# Check if out directory exists
if [ ! -d "out" ]; then
    echo "❌ Error: 'out' directory not found"
    echo "💡 Please run 'npm run build' first to build the website"
    exit 1
fi

echo "✅ Found pre-built files in 'out' directory"
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

# Copy hidden files (like .htaccess)
echo "📄 Copying hidden files (.htaccess)..."
if [ -f "out/.htaccess" ]; then
    cp out/.htaccess "$TARGET_DIR"
    echo "   ✓ .htaccess copied"
else
    echo "   ⚠ No .htaccess file found in out directory"
fi

# Set proper permissions (if needed for Hostinger)
echo "🔐 Setting permissions..."
find "$TARGET_DIR" -maxdepth 1 -type f -exec chmod 644 {} \;
find "$TARGET_DIR" -maxdepth 1 -type d -not -name "xirrcalculator" -exec chmod 755 {} \;

echo ""
echo "✅ Deployment completed successfully!"
echo "🌐 Website is now live at your domain"
echo ""
echo "📋 Deployment summary:"
echo "   Source: ./out/"
echo "   Target: $TARGET_DIR"
echo "   Files deployed: $(find out -type f | wc -l | tr -d ' ')"
echo ""
