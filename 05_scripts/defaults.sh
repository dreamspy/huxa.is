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
FRONTEND=${FRONTEND:-static}
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
