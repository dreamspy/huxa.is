#!/usr/bin/env bash
# Deploy main from the server's own checkout, as huxadev. What `fab deploy`
# used to do from the Mac: build the web app, commit dist if it changed,
# install backend requirements, refresh the preview unit, then the root half
# (nginx sites, reload, backend restart) through sudo, then push main.
# Run from /opt/huxa on a clean main. `fab deploy` on the Mac calls this.

set -euo pipefail

REPO=/opt/huxa
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"

cd "$REPO"
if [ "$(git rev-parse --show-toplevel)" != "$REPO" ]; then
    echo "run from $REPO, not a worktree" >&2
    exit 1
fi
if [ "$(git branch --show-current)" != "main" ]; then
    echo "not on main" >&2
    exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
    echo "working tree not clean:" >&2
    git status --short >&2
    exit 1
fi

echo "== web build"
(cd 08_app && npm install --no-audit --no-fund >/dev/null && CI=1 npx expo export --platform web --clear >/dev/null)
git add 08_app/dist
if ! git diff --cached --quiet; then
    git commit -q -m "Build web dist"
fi

echo "== backend requirements"
02_backend/venv/bin/pip install -r 02_backend/requirements.txt --quiet

echo "== preview unit"
install -d ~/.config/systemd/user
install -m 644 '04_infrastructure/systemd/huxa-preview@.service' ~/.config/systemd/user/
systemctl --user daemon-reload

echo "== activate"
sudo -n /usr/local/sbin/huxa-activate

echo "== push"
git push origin main

sleep 1
echo "== health"
curl -sf https://huxa.is/health
echo
