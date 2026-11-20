#!/usr/bin/env bash
# ==============================================================================
# The Cosmic Vault - Automated Deployment to HP Laptop (192.168.1.209)
# Packages clean production bundle and securely copies it over SCP.
# ==============================================================================

set -e

DEST_IP="192.168.1.209"
DEST_USER="saad"
BUNDLE_NAME="MoneyPrinterTurbo-bundle.tar.gz"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================================"
echo "🚀 THE COSMIC VAULT — DEPLOY TO HP LAPTOP"
echo "========================================================"
echo "Target: $DEST_USER@$DEST_IP"

# 1. Check Network Connectivity
echo "📡 Checking connectivity to $DEST_IP..."
if ping -c 1 -W 2 "$DEST_IP" &> /dev/null; then
    echo "✅ HP Laptop ($DEST_IP) is online and reachable!"
else
    echo "❌ Cannot reach $DEST_IP. Ensure the laptop is on the same Wi-Fi/LAN network."
    exit 1
fi

# 2. Build the Lightweight Production Bundle
echo "📦 Packaging clean production bundle ($BUNDLE_NAME)..."
rm -f "$BUNDLE_NAME"
tar -czf "$BUNDLE_NAME" \
    --exclude=".git" \
    --exclude=".venv" \
    --exclude="__pycache__" \
    --exclude="storage/tasks" \
    --exclude="storage/cache_*" \
    --exclude="storage/*.png" \
    --exclude="storage/*.mp3" \
    --exclude="resource/untrusted_songs_backup" \
    --exclude="*.tar.gz" \
    --exclude=".DS_Store" \
    app \
    webui \
    resource \
    tools \
    docs \
    storage/tiktok_session.json \
    autopilot.py \
    tiktok_login.py \
    setup_linux.sh \
    config.toml \
    pyproject.toml \
    uv.lock \
    main.py \
    cli.py \
    AUTOMATION_GUIDE.md \
    SETUP_HP_LAPTOP.md \
    requirements.txt

BUNDLE_SIZE=$(du -h "$BUNDLE_NAME" | cut -f1)
echo "✅ Bundle created: $BUNDLE_NAME ($BUNDLE_SIZE)"

# 3. Transfer Bundle via SCP
echo "🚀 Transferring $BUNDLE_NAME to $DEST_USER@$DEST_IP:~ ..."
echo "👉 Note: If prompted, enter your HP laptop user password:"
scp "$BUNDLE_NAME" "$DEST_USER@$DEST_IP:~/"

echo ""
echo "========================================================"
echo "🎉 TRANSFER SUCCESSFUL!"
echo "========================================================"
echo "To finish setup on your HP laptop, run these 3 commands:"
echo ""
echo "  1. SSH into the laptop:"
echo "     ssh $DEST_USER@$DEST_IP"
echo ""
echo "  2. Extract the bundle:"
echo "     mkdir -p ~/MoneyPrinterTurbo && tar -xzf ~/$BUNDLE_NAME -C ~/MoneyPrinterTurbo"
echo ""
echo "  3. Run the automated Linux installer:"
echo "     cd ~/MoneyPrinterTurbo && ./setup_linux.sh"
echo "========================================================"
