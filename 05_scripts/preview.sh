#!/usr/bin/env bash
# Preview environments for worktrees on the server, as the huxadev user.
#   preview.sh up [topic]     build the worktree's web app, seed data, start the backend
#   preview.sh down <topic>   stop the backend and remove the preview's data
#   preview.sh list           previews and whether their backend is running
# topic defaults to the current directory's name when run inside /opt/huxa-dev/<topic>.
# The preview is served at https://dev-<topic>.huxa.is (see nginx/huxa-preview.conf).
# Data is a copy of the production JSONL files taken the first time `up` runs;
# later runs keep it. Attachments are not copied.

set -euo pipefail

WORKTREES=/opt/huxa-dev
PREVIEWS=/var/lib/huxa-preview
PROD_DATA=/var/lib/huxa
DOMAIN=huxa.is
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"

usage() {
    sed -n '3,6p' "$0" >&2
    exit 1
}

topic_from_arg() {
    local t="${1:-}"
    if [ -z "$t" ]; then
        case "$PWD" in
            "$WORKTREES"/*) t="${PWD#"$WORKTREES"/}"; t="${t%%/*}" ;;
            *) usage ;;
        esac
    fi
    if ! [[ "$t" =~ ^[a-z0-9-]+$ ]]; then
        echo "topic must be lowercase letters, digits and dashes: $t" >&2
        exit 1
    fi
    echo "$t"
}

cmd="${1:-}"
shift || true

case "$cmd" in
    up)
        topic=$(topic_from_arg "${1:-}")
        wt="$WORKTREES/$topic"
        dir="$PREVIEWS/$topic"
        url="https://dev-$topic.$DOMAIN"
        if [ ! -d "$wt/08_app" ]; then
            echo "no worktree at $wt" >&2
            exit 1
        fi

        mkdir -p "$dir/attachments" "$dir/derived"
        for f in events.jsonl diary.jsonl feedback.jsonl categories.json; do
            if [ ! -e "$dir/$f" ] && [ -e "$PROD_DATA/$f" ]; then
                cp "$PROD_DATA/$f" "$dir/$f"
            fi
        done
        cat > "$dir/env" <<ENV
HUXA_EVENTS_FILE=$dir/events.jsonl
HUXA_DIARY_FILE=$dir/diary.jsonl
HUXA_FEEDBACK_FILE=$dir/feedback.jsonl
HUXA_CATEGORIES_FILE=$dir/categories.json
HUXA_ATTACHMENTS_DIR=$dir/attachments
ENV

        echo "building web app for $url"
        rm -rf "$dir/www"
        (cd "$wt/08_app" && CI=1 EXPO_PUBLIC_API_BASE="$url" npx expo export --platform web --output-dir "$dir/www" >/dev/null)

        systemctl --user restart "huxa-preview@$topic"
        for _ in $(seq 1 20); do
            if curl -sf --unix-socket "$dir/backend.sock" http://localhost/health >/dev/null 2>&1; then
                echo "$url"
                exit 0
            fi
            sleep 0.5
        done
        echo "backend did not come up, see: journalctl --user -u huxa-preview@$topic" >&2
        exit 1
        ;;
    down)
        topic=$(topic_from_arg "${1:-}")
        systemctl --user stop "huxa-preview@$topic" 2>/dev/null || true
        rm -rf "${PREVIEWS:?}/$topic"
        echo "preview $topic removed"
        ;;
    list)
        for d in "$PREVIEWS"/*/; do
            [ -d "$d" ] || continue
            t=$(basename "$d")
            printf '%-40s %s\n' "https://dev-$t.$DOMAIN" "$(systemctl --user is-active "huxa-preview@$t" 2>/dev/null || true)"
        done
        ;;
    *)
        usage
        ;;
esac
