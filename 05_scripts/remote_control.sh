#!/usr/bin/env bash
# Keep the Claude Code Remote Control server running in tmux, as the dev user.
#   remote_control.sh            start it if it is not running (tmux session too)
#   remote_control.sh restart    stop it, wait for it to exit, start it again
#   remote_control.sh stop
#   remote_control.sh status
#   remote_control.sh enable     start it now and at every boot, through a systemd user unit
#   remote_control.sh disable    no longer start it at boot; leaves it running
#   remote_control.sh boot       what the unit runs: wait for the network, then start
# Sessions appear in the Claude app under the prefix <PROJECT>. Attach to watch
# with: tmux attach -t <PROJECT>. No --permission-mode: a flag would override
# defaultMode in the repo's .claude/settings.json, which is where permissions live.

set -euo pipefail
. "$(dirname "$(readlink -f "$0")")/lib.sh"

SESSION=$PROJECT
CLAUDE="${HOME}/.local/bin/claude"
[ -x "$CLAUDE" ] || CLAUDE=claude
# --spawn is given because the command otherwise stops to ask for it.
START="cd $REPO && $CLAUDE remote-control --spawn=same-dir --remote-control-session-name-prefix $PROJECT"

PATTERN='^(node )?[^ ]*claude remote-control'

running() {
    pgrep -u "$(id -u)" -f "$PATTERN" >/dev/null
}

start() {
    if running; then
        echo "remote control already running"
        return
    fi
    if ! tmux has-session -t "$SESSION" 2>/dev/null; then
        tmux new-session -d -s "$SESSION" -c "$REPO"
    fi
    tmux send-keys -t "$SESSION" "$START" Enter
    sleep 3
    if running; then
        echo "remote control started in tmux session $SESSION"
    else
        echo "remote control did not start; look with: tmux attach -t $SESSION" >&2
        exit 1
    fi
}

stop() {
    if running; then
        pkill -u "$(id -u)" -f "$PATTERN"
        # Wait for it to exit: starting next to a dying one leaves two servers.
        for _ in $(seq 20); do
            running || break
            sleep 1
        done
        if running; then
            pkill -9 -u "$(id -u)" -f "$PATTERN" || true
            sleep 1
        fi
    fi
    echo "remote control stopped"
}

enable() {
    local src="$REPO/$INFRA_DIR/systemd/$RC_UNIT"
    [ -f "$src" ] || die "no $src; render the project with init.sh and pull"
    [ "$(loginctl show-user "$(id -un)" -p Linger --value 2>/dev/null)" = yes ] \
        || die "lingering is off for $(id -un), so nothing of it starts at boot; do setup step 4 first"
    install -d ~/.config/systemd/user
    install -m 644 "$src" ~/.config/systemd/user/
    systemctl --user daemon-reload
    systemctl --user enable -q "$RC_UNIT"
    # Starting the unit runs boot, which leaves a server that already runs alone.
    systemctl --user start "$RC_UNIT"
    echo "remote control starts at boot"
}

boot() {
    for _ in $(seq 60); do
        getent hosts api.anthropic.com >/dev/null 2>&1 && break
        sleep 2
    done
    start
}

case "${1:-start}" in
    start) start ;;
    stop) stop ;;
    restart) stop; start ;;
    enable) enable; "$0" status ;;
    disable) systemctl --user disable -q "$RC_UNIT"; echo "remote control no longer starts at boot" ;;
    boot) boot ;;
    status)
        tmux has-session -t "$SESSION" 2>/dev/null && echo "tmux session $SESSION: up" || echo "tmux session $SESSION: down"
        running && echo "remote control: running" || echo "remote control: not running"
        if [ "$(systemctl --user is-enabled "$RC_UNIT" 2>/dev/null || true)" = enabled ]; then
            echo "starts at boot: yes"
        else
            echo "starts at boot: no (remote_control.sh enable)"
        fi
        ;;
    *) sed -n '3,9p' "$0" >&2; exit 1 ;;
esac
