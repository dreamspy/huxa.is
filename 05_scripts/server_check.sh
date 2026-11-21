#!/usr/bin/env bash
# Read-only health check of the phone workflow on the server, as the dev user.
# Prints one line per thing the workflow relies on, ok or MISSING, and exits
# non-zero when anything is missing. A MISSING line names the setup step that
# fixes it; the steps are in <DOCS_DIR>/phone-workflow.md. Run it after setup and whenever something
# is off:
#   ssh <DEV_USER>@<host> <REPO>/<SCRIPTS_DIR>/server_check.sh

set -uo pipefail
. "$(dirname "$(readlink -f "$0")")/lib.sh"

fail=0
ok()  { printf '  ok       %s\n' "$*"; }
bad() { printf '  MISSING  %s\n' "$*"; fail=1; }

echo "== $PROJECT on $(hostname), $(id -un)"
[ "$(id -un)" = "$DEV_USER" ] && ok "running as $DEV_USER" || bad "run this as $DEV_USER"

echo "== checkout"
if [ -d "$REPO/.git" ]; then
    ok "$REPO on $(git -C "$REPO" branch --show-current)"
    [ -z "$(git -C "$REPO" status --porcelain)" ] && ok "working tree clean" || bad "working tree not clean (ship will refuse)"
else
    bad "no checkout at $REPO (step 2)"
fi
[ -d "$WORKTREES" ] && [ -w "$WORKTREES" ] && ok "worktree dir $WORKTREES writable" || bad "worktree dir $WORKTREES missing or not writable (step 2)"
[ -f "$REPO/.claude/settings.json" ] && ok ".claude/settings.json committed" || bad "$REPO/.claude/settings.json missing, sessions will prompt (step 1: render, commit, push; then git pull here)"
grep -q '^## Worktree' "$REPO/CLAUDE.md" 2>/dev/null && ok "CLAUDE.md has a Worktree section" || bad "no Worktree section in $REPO/CLAUDE.md (step 1: render, commit, push; then git pull here)"

echo "== previews"
[ -d "$PREVIEWS" ] && [ -w "$PREVIEWS" ] && ok "preview dir $PREVIEWS writable" || bad "preview dir $PREVIEWS missing or not writable (step 4)"
[ -L "/etc/nginx/sites-enabled/$PROJECT-preview" ] && ok "nginx site $PROJECT-preview enabled" || bad "nginx site $PROJECT-preview not enabled (step 4)"
if [ -r "$SSL_CERT" ]; then
    openssl x509 -in "$SSL_CERT" -noout -ext subjectAltName 2>/dev/null | grep -q "\*\.$DOMAIN" && ok "certificate covers *.$DOMAIN" || bad "certificate $SSL_CERT does not cover *.$DOMAIN (step 3)"
else
    [ -e "$SSL_CERT" ] && ok "certificate $SSL_CERT exists (not readable by $DEV_USER, names unchecked)" || bad "certificate $SSL_CERT missing (step 3)"
fi
if getent hosts "dev-check.$DOMAIN" >/dev/null 2>&1; then
    ok "wildcard DNS resolves (dev-check.$DOMAIN)"
else
    bad "dev-check.$DOMAIN does not resolve: no wildcard A record *.$DOMAIN -> $SERVER_IP (step 3)"
fi
[ "$(loginctl show-user "$DEV_USER" -p Linger --value 2>/dev/null)" = yes ] && ok "linger on for $DEV_USER" || bad "linger off, nothing of $DEV_USER starts at boot (step 4)"
if has_backend; then
    [ -f "$HOME/.config/systemd/user/$UNIT@.service" ] && ok "unit $UNIT@.service installed" || bad "unit $UNIT@.service not installed (step 4)"
    systemctl --user is-system-running >/dev/null 2>&1 && ok "systemd user instance running" || bad "systemd user instance not running (step 4)"
    [ -r "$SECRETS_FILE" ] && ok "secrets file $SECRETS_FILE readable" || bad "secrets file $SECRETS_FILE missing or not readable (step 4)"
fi
[ -n "$PROD_DATA" ] && { [ -r "$PROD_DATA" ] && ok "production data $PROD_DATA readable" || bad "production data $PROD_DATA not readable by $DEV_USER (step 2: set the permissions as root)"; [ -w "$PROD_DATA" ] && bad "production data $PROD_DATA is WRITABLE by $DEV_USER (step 2: set the permissions as root)" || ok "production data $PROD_DATA not writable"; }

echo "== shipping"
[ -x "$ACTIVATE" ] && ok "$ACTIVATE installed" || bad "$ACTIVATE missing (step 5)"
sudo -n -l 2>/dev/null | grep -q "$ACTIVATE" && ok "sudo rule for $ACTIVATE" || bad "no sudo rule for $ACTIVATE (step 5)"
[ -L "/etc/nginx/sites-enabled/$PROJECT" ] && ok "nginx site $PROJECT enabled" || bad "nginx site $PROJECT not enabled (step 7, the first deploy installs it)"
[ -n "$SERVICE" ] && { systemctl is-active --quiet "$SERVICE" && ok "service $SERVICE active" || bad "service $SERVICE not active"; }

echo "== sessions"
command -v "$HOME/.local/bin/claude" >/dev/null 2>&1 && ok "Claude Code $("$HOME/.local/bin/claude" --version 2>/dev/null | head -1)" || bad "Claude Code not installed for $DEV_USER (step 6)"
[ -f "$HOME/.claude/skills/worktree-feature/SKILL.md" ] && ok "worktree-feature skill present" || bad "worktree-feature skill missing in ~/.claude/skills/ (step 6)"
[ -f "$HOME/.claude/CLAUDE.md" ] && ok "user CLAUDE.md present" || bad "~/.claude/CLAUDE.md missing (step 6)"
grep -q '"oauthAccount"' "$HOME/.claude.json" 2>/dev/null && ok "logged in" || bad "not logged in: run claude in $REPO, then /login (step 6)"
[ "$(systemctl --user is-enabled "$RC_UNIT" 2>/dev/null || true)" = enabled ] && ok "remote control starts at boot" || bad "remote control does not start at boot: remote_control.sh enable (step 8)"
"$kit_dir/remote_control.sh" status 2>/dev/null | sed 's/^/  /'

if [ -n "$SKILLS_REPO" ]; then
    echo "== skills"
    if [ -d "$SKILLS_DIR/.git" ]; then
        ok "skills clone $SKILLS_DIR at $(git -C "$SKILLS_DIR" log -1 --format=%h)"
        [ -z "$(git -C "$SKILLS_DIR" status --porcelain)" ] && ok "skills clone has no uncommitted changes" || bad "skills clone has uncommitted changes: commit and push them"
        if timeout 30 git -C "$SKILLS_DIR" fetch -q 2>/dev/null; then
            behind=$(git -C "$SKILLS_DIR" rev-list --count 'HEAD..@{u}' 2>/dev/null || echo "?")
            ahead=$(git -C "$SKILLS_DIR" rev-list --count '@{u}..HEAD' 2>/dev/null || echo "?")
            [ "$behind" = 0 ] && ok "skills clone up to date with GitHub" || bad "skills clone is $behind commits behind GitHub: tell the integrator update kit"
            [ "$ahead" = 0 ] && ok "skills clone has nothing unpushed" || bad "skills clone has $ahead commits GitHub does not have: git -C $SKILLS_DIR push"
        else
            bad "cannot fetch $SKILLS_REPO; is the deploy key id_ed25519_skills still on GitHub? (step 2)"
        fi
        if links=$("$SKILLS_DIR/install.sh" --check 2>&1); then
            ok "~/.claude/skills links into the clone"
        else
            bad "~/.claude/skills does not link into the clone: $SKILLS_DIR/install.sh"
            printf '%s\n' "$links" | sed 's/^/           /'
        fi
        stamp=$(cat "$kit_dir/.kit-version" 2>/dev/null || true)
        commit=${stamp%-dirty}
        if [ -z "$commit" ]; then
            bad "no $SCRIPTS_DIR/.kit-version, so the kit's age is unknown: tell the integrator update kit"
        elif [ "$commit" != "$stamp" ]; then
            bad "this project was rendered from uncommitted kit changes; commit and push them in the skills repo, then update kit"
        elif ! git -C "$SKILLS_DIR" cat-file -e "$commit^{commit}" 2>/dev/null; then
            bad "this project was rendered from kit commit ${commit:0:12}, which the clone does not have: push the skills repo where it was rendered, then update kit"
        elif git -C "$SKILLS_DIR" diff --quiet "$commit" HEAD -- phone-dev-workflow/templates; then
            ok "project kit matches the skills clone"
        else
            bad "this project was rendered from an older kit (${commit:0:12}): tell the integrator update kit"
        fi
    else
        bad "no skills clone at $SKILLS_DIR (step 2)"
    fi
fi

echo "== state"
"$kit_dir/preview.sh" list 2>/dev/null | sed 's/^/  /'
git -C "$REPO" worktree list 2>/dev/null | sed 's/^/  /'
free -h 2>/dev/null | sed -n '2p' | sed 's/^/  /'
df -h / 2>/dev/null | sed -n '2p' | sed 's/^/  /'

exit $fail
