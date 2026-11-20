#!/usr/bin/env bash
# ==============================================================================
# The Cosmic Vault - Autonomous Pipeline Setup Script for Ubuntu Linux / HP Laptop
# Installs dependencies, sets up virtualenv, installs Playwright Chromium,
# and configures automated cron scheduling.
# ==============================================================================

set -e

echo "========================================================"
echo "🚀 THE COSMIC VAULT — LINUX AUTOMATION SETUP"
echo "========================================================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 1. Check & Install System Dependencies (ffmpeg, curl, etc.)
echo "📦 Step 1: Checking system packages (ffmpeg, curl)..."
if ! command -v ffmpeg &> /dev/null; then
    echo "Installing ffmpeg via apt..."
    sudo apt update && sudo apt install -y ffmpeg curl git
else
    echo "✅ ffmpeg is already installed."
fi

# 2. Check & Install uv (Fast Python Package Manager)
echo "⚡ Step 2: Checking 'uv' package manager..."
if ! command -v uv &> /dev/null; then
    echo "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.local/bin:$PATH"
else
    echo "✅ uv is already installed."
fi

# 3. Install Python Dependencies
echo "🐍 Step 3: Installing Python virtual environment & dependencies..."
uv sync

# 4. Install Playwright Chromium with Linux System Dependencies
echo "🌐 Step 4: Installing Playwright Chromium & browser dependencies..."
uv run playwright install chromium --with-deps

# 5. Verify Setup
echo "🔍 Step 5: Verifying configuration & session..."
if [ -f "config.toml" ]; then
    echo "✅ config.toml found!"
else
    echo "⚠️ Warning: config.toml not found. Please ensure it is present."
fi

if [ -f "storage/tiktok_session.json" ]; then
    echo "✅ TikTok authenticated session found!"
else
    echo "⚠️ Notice: storage/tiktok_session.json not found. Run 'uv run python tiktok_login.py' to authenticate."
fi

echo ""
echo "========================================================"
echo "🎉 SETUP COMPLETE!"
echo "========================================================"
echo "To test video production right now, run:"
echo "  uv run python autopilot.py --count 1"
echo ""
echo "To schedule 3 videos daily via cron (e.g. at 9 AM, 2 PM, 7 PM), add this to 'crontab -e':"
echo "  0 9,14,19 * * * cd $SCRIPT_DIR && $HOME/.local/bin/uv run python autopilot.py --count 1 >> $SCRIPT_DIR/storage/cron.log 2>&1"
echo "========================================================"
