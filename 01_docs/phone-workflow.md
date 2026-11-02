# Phone workflow

Features for HuXa can be requested, tested and shipped from the phone. Claude Code runs on the server inside tmux as `huxadev`, the Claude app drives it through Remote Control, every feature gets a preview at `https://dev-<topic>.huxa.is`, and "ship it" merges and deploys on the same box.

## Start or resume the session

From any terminal (the Mac, or an SSH app on the phone over Tailscale):

```bash
ssh huxadev@huxa
tmux attach -t huxa || tmux new -s huxa
cd /opt/huxa && claude --add-dir /opt/huxa-dev
```

Inside Claude run `/remote-control`. Open the Claude app, Code tab, and the session is listed. Detach tmux with Ctrl-b then d; the session keeps running until the box reboots.

`--add-dir /opt/huxa-dev` puts the worktrees in scope so edits there do not prompt.

## The loop

1. Ask: `/worktree-feature <what you want>`. The reply ends with a **Test it** section carrying the preview URL.
2. Test on the phone at `https://dev-<topic>.huxa.is`. The token is the production one. The preview runs on a copy of the production data taken when it was first built, so anything logged there stays out of production.
3. Follow up in the same session until it is right. Each change is rebuilt into the preview, about half a minute.
4. Say `ship it`. Claude asks which version digit to bump, updates the changelog, merges into main, runs `05_scripts/deploy.sh`, removes the preview and the worktree, and tells you to reload huxa.is.

The rules Claude follows for this are the Worktree section of `CLAUDE.md`.

## Housekeeping

```bash
/opt/huxa/05_scripts/preview.sh list            # previews and whether their backend runs
/opt/huxa/05_scripts/preview.sh down <topic>    # stop and delete a preview's data
git -C /opt/huxa worktree list
```

Idle previews cost nothing but disk. A rebooted server restarts preview backends on its own (the dev user lingers), but the tmux session and Claude are gone; start them again as above.

## Deploying from the Mac still works

`fab deploy` pushes main, runs `05_scripts/deploy.sh` on the server (build, requirements, nginx, restart, push) and pulls the resulting dist commit back. Nothing is built on the Mac any more.

## Pieces

| Piece | Where |
|---|---|
| Server preparation | `05_scripts/server_dev_setup.sh`, `server_preview_setup.sh`, `server_ship_setup.sh` (root, once each) |
| Previews | `05_scripts/preview.sh`, `04_infrastructure/nginx/huxa-preview.conf`, `04_infrastructure/systemd/huxa-preview@.service` |
| Shipping | `05_scripts/deploy.sh`, `04_infrastructure/sudo/huxa-activate` (root half), `04_infrastructure/sudo/huxadev` (sudoers) |
| Secrets for previews | `/etc/huxa/preview.env`, copied from the production unit by `server_preview_setup.sh` |
