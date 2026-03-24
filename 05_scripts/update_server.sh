#!/usr/bin/env bash
# Update and patch the HuXa production server.
# Run from your local machine: ./05_scripts/update_server.sh

set -euo pipefail

HOST="huxa"

echo "=== Updating packages ==="
ssh "$HOST" "sudo apt update && sudo apt upgrade -y"

echo ""
echo "=== Checking for kernel reboot ==="
REBOOT_NEEDED=$(ssh "$HOST" "[ -f /var/run/reboot-required ] && echo yes || echo no")
if [ "$REBOOT_NEEDED" = "yes" ]; then
    echo "Kernel update requires reboot."
    read -p "Reboot now? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ssh "$HOST" "sudo reboot"
        echo "Rebooting... wait ~30s then check: ssh $HOST"
    else
        echo "Skipped. Reboot manually when ready: ssh $HOST sudo reboot"
    fi
else
    echo "No reboot needed."
fi

echo ""
echo "=== Service status ==="
ssh "$HOST" "sudo systemctl status huxa --no-pager -l"
echo ""
ssh "$HOST" "sudo fail2ban-client status sshd 2>/dev/null || echo 'fail2ban: not monitoring sshd yet'"
