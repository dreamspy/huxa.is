#!/usr/bin/env bash
# One-time server setup for deploying from the box: installs the root half of
# a deploy (huxa-activate) and the sudoers rule that lets huxadev run it.
# Safe to re-run; re-run it after changing 04_infrastructure/sudo/huxa-activate.
#
# Run from the Mac:
#   ssh huxa 'sudo bash -s' < 05_scripts/server_ship_setup.sh

set -euo pipefail

REPO=/opt/huxa
DEV_USER=huxadev

if [ "$(id -u)" -ne 0 ]; then
    echo "run as root" >&2
    exit 1
fi

install -m 755 -o root -g root "$REPO/04_infrastructure/sudo/huxa-activate" /usr/local/sbin/huxa-activate
install -m 440 -o root -g root "$REPO/04_infrastructure/sudo/huxadev" /etc/sudoers.d/huxadev
visudo -cf /etc/sudoers.d/huxadev
echo "== what $DEV_USER may run as root"
sudo -Hu "$DEV_USER" sudo -n -l | grep -A1 'may run' || true
