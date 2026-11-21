# Shared by every script in this directory. Loads workflow.conf, the defaults
# and hooks.sh from the directory this file lives in and defines the helpers.
# Source it; do not run it.

kit_dir=$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)
set -a
# shellcheck source=/dev/null
. "$kit_dir/workflow.conf"
# shellcheck source=/dev/null
. "$kit_dir/defaults.sh"
# shellcheck source=/dev/null
. "$kit_dir/hooks.sh"
set +a
# systemctl --user finds the user manager through this, and a shell started
# over ssh or by sudo does not always carry it.
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"

die() { echo "$*" >&2; exit 1; }
need_root() { [ "$(id -u)" -eq 0 ] || die "run as root"; }
need_dev_user() { [ "$(id -un)" = "$DEV_USER" ] || die "run as $DEV_USER (you are $(id -un))"; }
has_backend() { [ "$BACKEND" != none ]; }
preview_url() { echo "https://dev-$1.$DOMAIN"; }

# The topic is the argument, or the first path element under WORKTREES when run
# from inside a worktree. Lowercase letters, digits and dashes only: it becomes
# a host name and a systemd instance name.
topic_from_arg() {
    local t="${1:-}"
    if [ -z "$t" ]; then
        case "$PWD" in
            "$WORKTREES"/*) t="${PWD#"$WORKTREES"/}"; t="${t%%/*}" ;;
            *) die "no topic given and not inside $WORKTREES/<topic>" ;;
        esac
    fi
    [[ "$t" =~ ^[a-z0-9-]+$ ]] || die "topic must be lowercase letters, digits and dashes: $t"
    echo "$t"
}
