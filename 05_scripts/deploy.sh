#!/usr/bin/env bash
# Deploy the base branch from the server's own checkout, as the dev user:
# install dependencies, build the site into the dist dir nginx serves, commit
# the build when the project keeps it in git (COMMIT_DIST), refresh the preview
# unit, run the root half
# (<PROJECT>-activate: nginx sites, reload, service restart) through sudo, push,
# check health. Run from a clean <REPO> on the base branch; refuses a worktree.
#   deploy.sh          deploy what the checkout holds (a ship merged it here)
#   deploy.sh --pull   fast-forward the base branch from origin first: a deploy
#                      of what was pushed from elsewhere, the Mac for one

set -euo pipefail
. "$(dirname "$(readlink -f "$0")")/lib.sh"

pull=
case "${1:-}" in
    --pull) pull=1 ;;
    "") ;;
    *) die "usage: deploy.sh [--pull]" ;;
esac

need_dev_user
cd "$REPO"
[ "$(git rev-parse --show-toplevel)" = "$REPO" ] || die "run from $REPO, not a worktree"
[ "$(git branch --show-current)" = "$BASE_BRANCH" ] || die "not on $BASE_BRANCH"
if [ -n "$(git status --porcelain)" ]; then
    git status --short >&2
    die "working tree not clean"
fi

if [ -n "$pull" ]; then
    echo "== pull"
    git pull --ff-only origin "$BASE_BRANCH"
fi

# Asked about a file inside: a "dist/" rule does not match the bare name while
# the directory does not exist yet.
if [ -z "$COMMIT_DIST" ] && ! git check-ignore -q "$DIST_DIR/index.html"; then
    die "$DIST_DIR is neither ignored nor committed: add it to .gitignore, or set COMMIT_DIST=1 in workflow.conf"
fi

echo "== dependencies"
deploy_deps

echo "== build"
build_frontend "https://$DOMAIN" "$REPO/$DIST_DIR"
if [ -n "$COMMIT_DIST" ]; then
    git add -A -- "$DIST_DIR"
    if ! git diff --cached --quiet; then
        git commit -q -m "Build web dist"
    fi
fi

echo "== user units"
install -d ~/.config/systemd/user
if has_backend; then
    install -m 644 "$REPO/$INFRA_DIR/systemd/$UNIT@.service" ~/.config/systemd/user/
fi
# Only the file is refreshed: restarting Remote Control would end every session.
if [ "$(systemctl --user is-enabled "$RC_UNIT" 2>/dev/null || true)" = enabled ]; then
    install -m 644 "$REPO/$INFRA_DIR/systemd/$RC_UNIT" ~/.config/systemd/user/
fi
systemctl --user daemon-reload

echo "== activate"
sudo -n "$ACTIVATE"

echo "== push"
git push origin "$BASE_BRANCH"

if [ -n "$HEALTH_PATH" ]; then
    sleep 1
    echo "== health"
    if server_rendered; then
        # The health path is a page here; its status is enough, not its HTML.
        curl -sf -o /dev/null -w "https://$DOMAIN$HEALTH_PATH -> %{http_code}\n" "https://$DOMAIN$HEALTH_PATH"
    else
        curl -sf "https://$DOMAIN$HEALTH_PATH"
        echo
    fi
else
    echo "== site"
    curl -s -o /dev/null -w "https://$DOMAIN -> %{http_code}\n" "https://$DOMAIN/"
fi
