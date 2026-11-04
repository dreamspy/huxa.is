# Phone workflow

Features for HuXa can be requested, tested and shipped from the phone. Claude Code runs on the server inside tmux as `huxadev`, the Claude app drives it through Remote Control, every feature gets a preview at `https://dev-<topic>.huxa.is`, and "ship it" merges and deploys on the same box.

## Start or resume the server

Remote Control runs as a server: one process in tmux, and the Claude app starts as many sessions against it as you like. One command starts or restarts it, tmux session included:

```bash
ssh huxadev@huxa /opt/huxa/05_scripts/remote_control.sh            # start if not running
ssh huxadev@huxa /opt/huxa/05_scripts/remote_control.sh restart
ssh huxadev@huxa /opt/huxa/05_scripts/remote_control.sh status
```

It runs `claude remote-control --spawn=same-dir --remote-control-session-name-prefix huxa` in `/opt/huxa`, so sessions appear in the app as `huxa-...`. The permission mode is not given on the command line; it comes from the committed `.claude/settings.json`: auto mode, `/opt/huxa-dev` in scope, routine git, preview, Expo, npm and curl commands allowed, force pushes and `deploy.sh` still asking, writes to `/var/lib/huxa` and sudo denied. A `--permission-mode` flag would override that file, so do not add one. Sessions already open when the server restarts end with it; their worktrees and transcripts stay on disk. To watch the server: `ssh huxadev@huxa`, then `tmux attach -t huxa`, detach with Ctrl-b then d.

## Sessions

The model is the one from the Mac: one integrator session, any number of feature sessions, all in the Claude app under the huxa server.

- **Integrator.** The session pre-created when the server starts. It lives in `/opt/huxa` and only merges and deploys. Keep it; never ask it to implement.
- **Feature sessions.** Start a new session from the app for each feature and open with `/worktree-feature <what you want>`. The skill creates the worktree in `/opt/huxa-dev/<topic>` and the preview. Keep that session for follow-ups until the feature is shipped, then let it go.

## The loop

1. In a new session: `/worktree-feature <what you want>`. The reply ends with **Test it** carrying the preview URL and a **Handover** block.
2. Test on the phone at `https://dev-<topic>.huxa.is`. The token is the production one, and the app shares it between huxa.is and the previews through a cookie on `huxa.is`, so a browser that is already logged in on huxa.is needs no token there. The preview runs on a copy of the production data taken when it was first built, so anything logged there stays out of production.
3. Follow up in the same session until it is right. Each change is rebuilt into the preview, about half a minute.
4. In the integrator session: `ship <topic>`, or paste the handover block. It asks which version digit to bump, updates the changelog, merges into main, runs `05_scripts/deploy.sh`, removes the preview and the worktree, and tells you to reload huxa.is. One feature at a time.

The rules the sessions follow are the Worktree section of `CLAUDE.md`.

## Housekeeping

```bash
/opt/huxa/05_scripts/preview.sh list            # previews and whether their backend runs
/opt/huxa/05_scripts/preview.sh down <topic>    # stop and delete a preview's data
git -C /opt/huxa worktree list
```

Idle previews cost nothing but disk. A rebooted server restarts preview backends on its own (the dev user lingers), but the tmux session and the Remote Control server are gone; start them again as above. Memory is the limit on parallel sessions: each one takes a few hundred MB and a build peaks around 400 MB, so four or five at once is comfortable on the t3.medium.

## Deploying from the Mac still works

`fab deploy` pushes main, runs `05_scripts/deploy.sh` on the server (build, requirements, nginx, restart, push) and pulls the resulting dist commit back. Nothing is built on the Mac any more.

## Pieces

| Piece | Where |
|---|---|
| Server preparation | `05_scripts/server_dev_setup.sh`, `server_preview_setup.sh`, `server_ship_setup.sh` (root, once each) |
| Previews | `05_scripts/preview.sh`, `04_infrastructure/nginx/huxa-preview.conf`, `04_infrastructure/systemd/huxa-preview@.service` |
| Shipping | `05_scripts/deploy.sh`, `04_infrastructure/sudo/huxa-activate` (root half), `04_infrastructure/sudo/huxadev` (sudoers) |
| Secrets for previews | `/etc/huxa/preview.env`, copied from the production unit by `server_preview_setup.sh` |
