#!/usr/bin/env bash
# Preview environments for worktrees on the server, as the dev user.
#   preview.sh bootstrap                  share the main checkout's dependencies into this worktree
#   preview.sh up [topic]                 build the worktree's site, seed data, start the backend, print the URL
#   preview.sh down <topic>               stop the backend and remove the preview's data
#   preview.sh remove [--force] <topic>   down, then drop the bootstrap links, the worktree and its branch
#   preview.sh list                       previews and whether their backend is running
# topic defaults to the current directory's name when run inside <WORKTREES>/<topic>.
# Served at https://dev-<topic>.<DOMAIN> by the <PROJECT>-preview nginx site.
# What is built, seeded and started comes from hooks.sh next to this file.

set -euo pipefail
. "$(dirname "$(readlink -f "$0")")/lib.sh"

usage() { sed -n '2,9p' "$0" >&2; exit 1; }

cmd="${1:-}"
shift || true

case "$cmd" in
    bootstrap)
        case "$PWD" in "$WORKTREES"/*) ;; *) die "run from inside $WORKTREES/<topic>" ;; esac
        bootstrap_worktree
        echo "bootstrapped $PWD"
        ;;
    up)
        topic=$(topic_from_arg "${1:-}")
        wt="$WORKTREES/$topic"
        dir="$PREVIEWS/$topic"
        url=$(preview_url "$topic")
        [ -d "$wt" ] || die "no worktree at $wt"

        mkdir -p "$dir"
        if has_backend; then
            seed_preview "$dir"
            preview_env "$dir" > "$dir/env"
        fi

        echo "building $url"
        rm -rf "${dir:?}/www"
        (cd "$wt" && build_frontend "$url" "$dir/www")
        if ! server_rendered; then
            [ -e "$dir/www/index.html" ] || die "build left no index.html in $dir/www"
        fi

        if has_backend; then
            # Enabled as well as started, so the backend comes back after a reboot.
            systemctl --user enable -q "$UNIT@$topic" 2>/dev/null || true
            systemctl --user restart "$UNIT@$topic"
            if [ -n "$HEALTH_PATH" ]; then
                for _ in $(seq 1 20); do
                    if curl -sf --unix-socket "$dir/backend.sock" "http://localhost$HEALTH_PATH" >/dev/null 2>&1; then
                        echo "$url"
                        exit 0
                    fi
                    sleep 0.5
                done
                die "backend did not come up, see: journalctl --user -u $UNIT@$topic"
            fi
        fi
        echo "$url"
        ;;
    down)
        topic=$(topic_from_arg "${1:-}")
        if has_backend; then
            systemctl --user disable -q --now "$UNIT@$topic" 2>/dev/null || true
        fi
        rm -rf "${PREVIEWS:?}/${topic:?}"
        echo "preview $topic removed"
        ;;
    remove)
        force=
        args=()
        for a in "$@"; do
            if [ "$a" = --force ]; then force=1; else args+=("$a"); fi
        done
        topic=$(topic_from_arg "${args[0]:-}")
        wt="$WORKTREES/$topic"
        branch=
        if [ -d "$wt" ]; then
            branch=$(git -C "$wt" branch --show-current)
            # Refuse before anything is touched: an unmerged branch or uncommitted
            # work is only thrown away on --force.
            if [ -z "$force" ]; then
                if [ -n "$branch" ] && ! git -C "$REPO" merge-base --is-ancestor "$branch" "$BASE_BRANCH"; then
                    die "branch $branch is not merged into $BASE_BRANCH; ship it first, or: preview.sh remove --force $topic"
                fi
                dirty=$(git -C "$wt" status --porcelain)
                for l in $BOOTSTRAP_LINKS; do
                    dirty=$(printf '%s\n' "$dirty" | grep -vxF "?? $l" || true)
                done
                if [ -n "$dirty" ]; then
                    printf '%s\n' "$dirty" >&2
                    die "worktree $wt has uncommitted changes; commit them, or: preview.sh remove --force $topic"
                fi
            fi
        fi
        "$0" down "$topic"
        if [ -d "$wt" ]; then
            for l in $BOOTSTRAP_LINKS; do
                if [ -L "$wt/$l" ]; then
                    rm "${wt:?}/${l:?}"
                fi
            done
            git -C "$REPO" worktree remove ${force:+--force} "$wt"
            echo "worktree $wt removed"
        else
            echo "no worktree at $wt"
        fi
        if [ -n "$branch" ]; then
            if [ -n "$force" ]; then
                git -C "$REPO" branch -D "$branch"
            else
                git -C "$REPO" branch -d "$branch"
            fi
        fi
        ;;
    list)
        for d in "$PREVIEWS"/*/; do
            [ -d "$d" ] || continue
            t=$(basename "$d")
            if has_backend; then
                state=$(systemctl --user is-active "$UNIT@$t" 2>/dev/null || true)
                if [ "$(systemctl --user is-enabled "$UNIT@$t" 2>/dev/null || true)" = enabled ]; then
                    state="$state, starts at boot"
                else
                    state="$state, NOT started at boot (run preview.sh up $t)"
                fi
            else
                state=static
            fi
            printf '%-40s %s\n' "$(preview_url "$t")" "$state"
        done
        ;;
    *)
        usage
        ;;
esac
