#!/usr/bin/env bash
# One-time preparation of a server for on-server feature development: packages
# (nginx included, for a box that has nothing yet), node, a swap file, a dev
# user that owns the checkout and a parent dir for worktrees, the shared
# dependency dirs, a build smoke test, and a clone of the skills repo that
# ~/.claude/skills links into. Safe to re-run; every step checks before it
# changes anything.
#
# Self-contained: init.sh inlined workflow.conf and the defaults below, so it can
# be piped to a server that has nothing yet:
#   ssh <host> 'sudo bash -s' < <SCRIPTS_DIR>/server_dev_setup.sh
# On a fresh server it makes one deploy key per repo (GitHub accepts a key on
# one repo only), prints the keys GitHub does not accept yet and stops. Add them
# with write access and run it again; it then clones both and goes on.

set -euo pipefail

# --- workflow.conf, inlined by init.sh: edit the conf and re-run init.sh ---
# Phone workflow configuration that reproduces huxa.is: Expo web build, FastAPI
# backend on uvicorn, JSONL data. The worked example of a project with a
# backend and data; compare the rendered files with reference/huxa-files/.

PROJECT=huxa
DOMAIN=huxa.is
GITHUB_REPO=dreamspy/huxa.is
SKILLS_REPO=dreamspy/claude-skills   # cloned to /home/<DEV_USER>/claude-skills; ~/.claude/skills links into it. Empty: copied by hand
SSH_HOST=huxa
SERVER_IP=54.246.181.20
ADMIN_USER=ubuntu
DEV_USER=huxadev

REPO=/opt/huxa
WORKTREES=/opt/huxa-dev
PREVIEWS=/var/lib/huxa-preview
PROD_DATA=/var/lib/huxa           # previews copy from it; the dev user reads it and cannot write it
SERVICE=huxa                      # production systemd service, restarted by activate
SERVICE_USER=huxa

SCRIPTS_DIR=05_scripts
INFRA_DIR=04_infrastructure
DOCS_DIR=01_docs
FRONTEND_DIR=08_app
DIST_DIR=08_app/dist
COMMIT_DIST=1                     # the build is committed ("Build web dist") and pulled back to the Mac
ALLOW_COMMANDS="npx expo *"

BACKEND=uvicorn
BACKEND_WORKDIR=${WORKTREES}/%i/02_backend
BACKEND_EXEC="${WORKTREES}/%i/02_backend/venv/bin/uvicorn app.main:app --uds ${PREVIEWS}/%i/backend.sock"
API_PATHS="events|diary|categories|query|transcribe|reports|attachments|health"   # keep equal to the production site's
API_BODY_LIMIT=25m
HEALTH_PATH=/health
SECRET_VARS="HUXA_AUTH_TOKEN OPENAI_API_KEY"
SECRET_SOURCE=unit                # read from the Environment of the production unit
SPA=1
CATCH_ALL=1                       # huxa's production site declares no default server on 443
RATE_ZONE=huxa                    # limit_req zone defined in huxa.conf

SSL_CERT=/etc/ssl/cloudflare/huxa.pem
SSL_KEY=/etc/ssl/cloudflare/huxa.key
NODE_MAJOR=22
SWAP_SIZE=2G

BASE_BRANCH=main
VERSION_STEP='Bump the patch digit without asking. `ship <topic> minor` or `ship <topic> major` bumps that digit instead. On the branch, set `APP_VERSION` in `08_app/App.js` and add the `CHANGELOG.md` section, both with the Edit tool. Then commit with `git -C /opt/huxa-dev/<topic> commit -am "Bump to vX.Y.Z"` as a command of its own.'
TESTS_SAFE='none, there is no test suite. Check the preview on the phone or with curl against the URL.'
TESTS_FULL=none
ACTIVATE_EXTRA='install -d -o huxa -g huxa /var/lib/huxa/attachments'
# --- defaults.sh ---
# Defaults, derived values and no-op hooks for the phone workflow. Sourced by
# lib.sh on the server and by init.sh on the Mac, after workflow.conf and
# before hooks.sh, so a conf only has to set what differs and a hooks file only
# the functions the project needs. Not a script; do not run it.

: "${PROJECT:?workflow.conf must set PROJECT}"
: "${DOMAIN:?workflow.conf must set DOMAIN}"
: "${DEV_USER:?workflow.conf must set DEV_USER}"

REPO=${REPO:-/opt/$PROJECT}
WORKTREES=${WORKTREES:-${REPO}-dev}
PREVIEWS=${PREVIEWS:-/var/lib/${PROJECT}-preview}
PROD_DATA=${PROD_DATA:-}
SERVICE=${SERVICE:-}
SERVICE_USER=${SERVICE_USER:-}
SCRIPTS_DIR=${SCRIPTS_DIR:-scripts}
INFRA_DIR=${INFRA_DIR:-infrastructure}
DOCS_DIR=${DOCS_DIR:-docs}
FRONTEND_DIR=${FRONTEND_DIR:-.}
DIST_DIR=${DIST_DIR:-dist}
COMMIT_DIST=${COMMIT_DIST:-}
BACKEND=${BACKEND:-none}
BACKEND_EXEC=${BACKEND_EXEC:-}
BACKEND_WORKDIR=${BACKEND_WORKDIR:-}
API_PATHS=${API_PATHS:-}
API_BODY_LIMIT=${API_BODY_LIMIT:-10m}
HEALTH_PATH=${HEALTH_PATH:-}
SECRET_VARS=${SECRET_VARS:-}
SECRET_SOURCE=${SECRET_SOURCE:-unit}
SSL_CERT=${SSL_CERT:-/etc/ssl/cloudflare/$DOMAIN.pem}
SSL_KEY=${SSL_KEY:-/etc/ssl/cloudflare/$DOMAIN.key}
RATE_ZONE=${RATE_ZONE:-}
SPA=${SPA:-}
# Unset means on; an empty value in the conf turns it off, hence no colon.
CATCH_ALL=${CATCH_ALL-1}
NODE_MAJOR=${NODE_MAJOR:-22}
SWAP_SIZE=${SWAP_SIZE:-2G}
BASE_BRANCH=${BASE_BRANCH:-main}
ADMIN_USER=${ADMIN_USER:-ubuntu}
SSH_HOST=${SSH_HOST:-$DOMAIN}
GITHUB_REPO=${GITHUB_REPO:-}
SKILLS_REPO=${SKILLS_REPO:-}
SKILLS_DIR=${SKILLS_DIR:-/home/$DEV_USER/claude-skills}
SERVER_IP=${SERVER_IP:-<server ip>}
VERSION_STEP=${VERSION_STEP:-No version bump; the merge commit is the release note.}
TESTS_SAFE=${TESTS_SAFE:-none}
TESTS_FULL=${TESTS_FULL:-none}
ACTIVATE_EXTRA=${ACTIVATE_EXTRA:-}
BOOTSTRAP_LINKS=${BOOTSTRAP_LINKS:-}

SECRETS_FILE=/etc/$PROJECT/preview.env
ACTIVATE=/usr/local/sbin/$PROJECT-activate
UNIT=$PROJECT-preview
RC_UNIT=$PROJECT-remote-control.service

# Hooks a project may leave out. hooks.sh is sourced after this file and
# overrides any of them. Each is documented in templates/README.md.
bootstrap_worktree() { :; }
install_shared_deps() { :; }
deploy_deps() { :; }
seed_preview() { :; }
preview_env() { :; }
build_frontend() { echo "hooks.sh must define build_frontend <url> <out_dir>" >&2; return 1; }
# --- end of inlined configuration ---

if [ "$(id -u)" -ne 0 ]; then
    echo "run as root" >&2
    exit 1
fi

echo "== packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q tmux git curl ca-certificates time rsync nginx openssl
if [ -n "$NODE_MAJOR" ]; then
    if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/^v//' | cut -d. -f1)" -lt "$NODE_MAJOR" ]; then
        curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
        apt-get install -y -q nodejs
    fi
    echo "node $(node -v), npm $(npm -v)"
fi

if [ -n "$SWAP_SIZE" ]; then
    echo "== swap"
    if ! swapon --show=NAME --noheadings | grep -qx /swapfile; then
        fallocate -l "$SWAP_SIZE" /swapfile
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
    fi
    grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    free -h | sed -n '1,3p'
fi

echo "== user $DEV_USER"
if ! id "$DEV_USER" >/dev/null 2>&1; then
    adduser --disabled-password --gecos "$PROJECT development" "$DEV_USER"
fi
# Same ssh keys as the admin user, so ssh <DEV_USER>@<host> works from the Mac and the phone
install -d -m 700 -o "$DEV_USER" -g "$DEV_USER" "/home/$DEV_USER/.ssh"
admin_home=$(getent passwd "$ADMIN_USER" | cut -d: -f6)
if [ -f "$admin_home/.ssh/authorized_keys" ] && [ ! -f "/home/$DEV_USER/.ssh/authorized_keys" ]; then
    install -m 600 -o "$DEV_USER" -g "$DEV_USER" "$admin_home/.ssh/authorized_keys" "/home/$DEV_USER/.ssh/authorized_keys"
fi
install -d -o "$DEV_USER" -g "$DEV_USER" "$WORKTREES"

echo "== github keys"
dev_home=$(getent passwd "$DEV_USER" | cut -d: -f6)
as_dev() { sudo -Hu "$DEV_USER" "$@"; }
[ -f "$dev_home/.ssh/id_ed25519" ] || as_dev ssh-keygen -q -t ed25519 -N "" -C "$DEV_USER@$DOMAIN" -f "$dev_home/.ssh/id_ed25519"
as_dev bash -c 'grep -q github.com ~/.ssh/known_hosts 2>/dev/null || ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts 2>/dev/null'
if [ -n "$SKILLS_REPO" ]; then
    # The skills repo is reached through the host alias github-skills, which
    # pins its own key; plain github.com keeps using id_ed25519.
    [ -f "$dev_home/.ssh/id_ed25519_skills" ] || as_dev ssh-keygen -q -t ed25519 -N "" -C "$DEV_USER@$DOMAIN skills" -f "$dev_home/.ssh/id_ed25519_skills"
    if ! grep -q '^Host github-skills$' "$dev_home/.ssh/config" 2>/dev/null; then
        printf '\nHost github-skills\n    HostName github.com\n    User git\n    IdentityFile ~/.ssh/id_ed25519_skills\n    IdentitiesOnly yes\n' >> "$dev_home/.ssh/config"
        chown "$DEV_USER:$DEV_USER" "$dev_home/.ssh/config"
        chmod 600 "$dev_home/.ssh/config"
    fi
fi

# Every key GitHub does not accept yet is printed at once, so one round of
# adding keys is enough.
missing=0
need_key() {
    local repo=$1 pub=$2
    echo
    echo "Add as a deploy key with write access to $repo, at https://github.com/$repo/settings/keys/new"
    cat "$pub"
    missing=1
}
if [ ! -d "$REPO/.git" ]; then
    [ -n "$GITHUB_REPO" ] || { echo "no checkout at $REPO and GITHUB_REPO is empty in workflow.conf; clone it there by hand and re-run" >&2; exit 1; }
    as_dev git ls-remote -q "git@github.com:$GITHUB_REPO.git" HEAD >/dev/null 2>&1 || need_key "$GITHUB_REPO" "$dev_home/.ssh/id_ed25519.pub"
fi
if [ -n "$SKILLS_REPO" ] && [ ! -d "$SKILLS_DIR/.git" ]; then
    as_dev git ls-remote -q "git@github-skills:$SKILLS_REPO.git" HEAD >/dev/null 2>&1 || need_key "$SKILLS_REPO" "$dev_home/.ssh/id_ed25519_skills.pub"
fi
if [ "$missing" = 1 ]; then
    echo
    echo "Then run this script again; it clones and continues."
    exit 0
fi

if [ -n "$SKILLS_REPO" ]; then
    echo "== skills"
    if [ ! -d "$SKILLS_DIR/.git" ]; then
        install -d -o "$DEV_USER" -g "$DEV_USER" "$SKILLS_DIR"
        as_dev git clone -q "git@github-skills:$SKILLS_REPO.git" "$SKILLS_DIR"
    fi
    echo "$SKILLS_DIR at $(as_dev git -C "$SKILLS_DIR" log -1 --format='%h %s')"
    as_dev bash "$SKILLS_DIR/install.sh"
fi

if [ ! -d "$REPO/.git" ]; then
    echo "== checkout"
    install -d -o "$DEV_USER" -g "$DEV_USER" "$REPO"
    sudo -Hu "$DEV_USER" git clone -q "git@github.com:$GITHUB_REPO.git" "$REPO"
    [ "$BASE_BRANCH" = "$(sudo -Hu "$DEV_USER" git -C "$REPO" branch --show-current)" ] || sudo -Hu "$DEV_USER" git -C "$REPO" checkout -q "$BASE_BRANCH"
fi

echo "== repo ownership"
owner=$(stat -c %U "$REPO")
if [ "$owner" != "$DEV_USER" ]; then
    echo "$REPO is owned by $owner; handing it to $DEV_USER"
    chown -R "$DEV_USER:$DEV_USER" "$REPO"
fi
if [ -n "$GITHUB_REPO" ]; then
    sudo -Hu "$DEV_USER" git -C "$REPO" remote set-url origin "git@github.com:$GITHUB_REPO.git"
fi
sudo -Hu "$DEV_USER" git -C "$REPO" status --short --branch | head -5

echo "== shared dependencies"
sudo -Hu "$DEV_USER" bash -c ". '$REPO/$SCRIPTS_DIR/lib.sh' && cd '$REPO' && install_shared_deps"

echo "== build smoke test (elapsed time and peak memory)"
smoke=$(mktemp -d /tmp/"$PROJECT"-smoke.XXXXXX)
chown "$DEV_USER" "$smoke"
sudo -Hu "$DEV_USER" /usr/bin/time -f 'elapsed %E, peak %M KB' bash -c ". '$REPO/$SCRIPTS_DIR/lib.sh' && cd '$REPO' && build_frontend 'https://$DOMAIN' '$smoke/www'"
[ -e "$smoke/www/index.html" ] && echo "build produced index.html" || echo "WARNING: no index.html in the build output" >&2
rm -rf "${smoke:?}"

if [ -n "$PROD_DATA" ]; then
    echo
    echo "== production data dir, for the preview step (nothing changed)"
    ls -ld "$PROD_DATA" "$PROD_DATA"/* 2>/dev/null | head -20 || true
    echo "$DEV_USER must be able to read it and must not be able to write it."
fi

echo
echo "Step 2 done. Next is step 3, the certificate and DNS, in $DOCS_DIR/phone-workflow.md."
