#!/usr/bin/env bash
# Keep the Remote Control server running in tmux on the huxa.is server, as huxadev.
#   remote_control.sh            start it if it is not running (tmux session too)
#   remote_control.sh restart    stop it and start it again
#   remote_control.sh stop
#   remote_control.sh status
# Sessions appear in the Claude app under the prefix "huxa". Attach to watch
# with: tmux attach -t huxa

set -euo pipefail

SESSION=huxa
REPO=/opt/huxa
CLAUDE="${HOME}/.local/bin/claude"
[ -x "$CLAUDE" ] || CLAUDE=claude
# No --permission-mode: a flag would override defaultMode in .claude/settings.json.
START="cd $REPO && $CLAUDE remote-control --spawn=same-dir --remote-control-session-name-prefix huxa"

running() {
    pgrep -u "$(id -u)" -f 'claude remote-control' >/dev/null
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
        pkill -u "$(id -u)" -f 'claude remote-control'
        sleep 1
    fi
    echo "remote control stopped"
}

case "${1:-start}" in
    start) start ;;
    stop) stop ;;
    restart) stop; start ;;
    status)
        tmux has-session -t "$SESSION" 2>/dev/null && echo "tmux session $SESSION: up" || echo "tmux session $SESSION: down"
        running && echo "remote control: running" || echo "remote control: not running"
        ;;
    *) sed -n '3,6p' "$0" >&2; exit 1 ;;
esac
