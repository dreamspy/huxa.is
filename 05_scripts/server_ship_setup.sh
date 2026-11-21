#!/usr/bin/env bash
# One-time server setup for deploying from the box: installs the root half of a
# deploy (<PROJECT>-activate) and the sudoers rule that lets the dev user run it,
# and nothing else, as root. Safe to re-run; re-run after changing the activate
# script in the repo:
#   ssh <host> 'sudo bash <REPO>/<SCRIPTS_DIR>/server_ship_setup.sh'

set -euo pipefail
. "$(dirname "$(readlink -f "$0")")/lib.sh"
need_root

install -m 755 -o root -g root "$REPO/$INFRA_DIR/sudo/$PROJECT-activate" "$ACTIVATE"
install -m 440 -o root -g root "$REPO/$INFRA_DIR/sudo/$DEV_USER" "/etc/sudoers.d/$DEV_USER"
visudo -cf "/etc/sudoers.d/$DEV_USER"
echo "== what $DEV_USER may run as root"
sudo -Hu "$DEV_USER" sudo -n -l | grep -A1 'may run' || true
