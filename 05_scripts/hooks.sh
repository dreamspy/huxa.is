# Project-specific half of the phone workflow for huxa.is. Sourced after
# workflow.conf and defaults.sh. Functions run as the dev user.

# Hardlinked node_modules (Metro resolves real paths), symlinked venv.
bootstrap_worktree() {
    cp -al "$REPO/08_app/node_modules" 08_app/node_modules
    ln -s "$REPO/02_backend/venv" 02_backend/venv
}

# The venv link is untracked (the venv/ ignore rule does not match a symlink).
BOOTSTRAP_LINKS="02_backend/venv"

install_shared_deps() {
    (cd "$REPO/08_app" && npm ci --no-audit --no-fund)
}

deploy_deps() {
    (cd 08_app && npm install --no-audit --no-fund >/dev/null)
    02_backend/venv/bin/pip install -r 02_backend/requirements.txt --quiet
}

# --clear: Metro inlines EXPO_PUBLIC_* at transform time and caches the result,
# so a preview built from a warm cache calls production.
build_frontend() {
    local url=$1 out=$2
    (cd 08_app && CI=1 EXPO_PUBLIC_API_BASE="$url" npx expo export --platform web --output-dir "$out" --clear >/dev/null)
}

# Called on every `up`; copies only what the preview does not have yet, so the
# data is a snapshot from the first build. Attachments are not copied.
seed_preview() {
    local dir=$1 f
    mkdir -p "$dir/attachments" "$dir/derived"
    for f in events.jsonl diary.jsonl feedback.jsonl categories.json; do
        if [ ! -e "$dir/$f" ] && [ -e "$PROD_DATA/$f" ]; then
            cp "$PROD_DATA/$f" "$dir/$f"
        fi
    done
}

# Environment of the preview backend, written to <preview dir>/env.
preview_env() {
    local dir=$1
    cat <<ENV
HUXA_EVENTS_FILE=$dir/events.jsonl
HUXA_DIARY_FILE=$dir/diary.jsonl
HUXA_FEEDBACK_FILE=$dir/feedback.jsonl
HUXA_CATEGORIES_FILE=$dir/categories.json
HUXA_ATTACHMENTS_DIR=$dir/attachments
ENV
}
