#!/usr/bin/env bash
# One-time preparation of the huxa.is server for on-server feature development:
# node 22, tmux, a swap file, a huxadev user that owns /opt/huxa, a parent dir
# for worktrees, the shared node_modules, and an ssh key for GitHub.
# Safe to re-run; every step checks before it changes anything.
#
# Run from the Mac:
#   ssh huxa 'sudo bash -s' < 05_scripts/server_dev_setup.sh

set -euo pipefail

DEV_USER=huxadev
REPO=/opt/huxa
WORKTREES=/opt/huxa-dev
NODE_MAJOR=22
SWAP_SIZE=2G

if [ "$(id -u)" -ne 0 ]; then
    echo "run as root" >&2
    exit 1
fi

echo "== packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q tmux git curl ca-certificates time
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/^v//' | cut -d. -f1)" -lt "$NODE_MAJOR" ]; then
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
    apt-get install -y -q nodejs
fi
echo "node $(node -v), npm $(npm -v)"

echo "== swap"
if ! swapon --show=NAME --noheadings | grep -qx /swapfile; then
    fallocate -l "$SWAP_SIZE" /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
fi
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h | sed -n '1,3p'

echo "== user $DEV_USER"
if ! id "$DEV_USER" >/dev/null 2>&1; then
    adduser --disabled-password --gecos "HuXa development" "$DEV_USER"
fi
# Same ssh keys as ubuntu, so `ssh huxadev@huxa` works from the Mac and the phone
install -d -m 700 -o "$DEV_USER" -g "$DEV_USER" "/home/$DEV_USER/.ssh"
if [ -f /home/ubuntu/.ssh/authorized_keys ]; then
    install -m 600 -o "$DEV_USER" -g "$DEV_USER" /home/ubuntu/.ssh/authorized_keys "/home/$DEV_USER/.ssh/authorized_keys"
fi
install -d -o "$DEV_USER" -g "$DEV_USER" "$WORKTREES"

echo "== repo ownership"
chown -R "$DEV_USER:$DEV_USER" "$REPO"
sudo -Hu "$DEV_USER" git -C "$REPO" remote set-url origin git@github.com:dreamspy/huxa.is.git
sudo -Hu "$DEV_USER" git -C "$REPO" status --short --branch | head -5

echo "== shared node_modules"
sudo -Hu "$DEV_USER" bash -c "cd $REPO/08_app && npm ci --no-audit --no-fund"

echo "== export smoke test (elapsed time and peak memory)"
sudo -Hu "$DEV_USER" bash -c "cd $REPO/08_app && CI=1 /usr/bin/time -f 'elapsed %E, peak %M KB' npx expo export --platform web --output-dir /tmp/huxa-export-test >/dev/null"
rm -rf /tmp/huxa-export-test

echo "== github key"
sudo -Hu "$DEV_USER" bash -c '[ -f ~/.ssh/id_ed25519 ] || ssh-keygen -q -t ed25519 -N "" -C "huxadev@huxa.is" -f ~/.ssh/id_ed25519'
sudo -Hu "$DEV_USER" bash -c 'grep -q github.com ~/.ssh/known_hosts 2>/dev/null || ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts 2>/dev/null'

echo
echo "== data dir and syncthing, for the preview step (nothing changed)"
ls -ld /var/lib/huxa /var/lib/huxa/*.jsonl 2>/dev/null || true
ps -o user=,cmd= -C syncthing 2>/dev/null || echo "no process named syncthing"

echo
echo "Add this as a deploy key with write access at"
echo "https://github.com/dreamspy/huxa.is/settings/keys/new"
echo
cat "/home/$DEV_USER/.ssh/id_ed25519.pub"
