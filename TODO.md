# TODO

## Stop the permission prompts in Remote Control sessions

Done 4 Nov 2026: `.claude/settings.json` is committed on main. It sets auto
mode, puts `/opt/huxa-dev` in scope so worktree edits stop prompting, allows
git, preview.sh, Expo, npm and curl, keeps force pushes, hard resets and
deploy.sh on the ask list, and denies writes to `/var/lib/huxa`, `/etc` and
sudo. A reminder for step 2 fires in the integrator session on 11 Nov 2026.

### 1. Restart remote-control

The server process still running was started with `--permission-mode
acceptEdits`. A mode given on the command line overrides `defaultMode` from
settings, so sessions it spawns stay in acceptEdits (edits silent, every Bash
call outside the allow list asks). The flag is removed from
`05_scripts/remote_control.sh` on main; the running process has to be
restarted to pick that up:

    ssh huxadev@huxa /opt/huxa/05_scripts/remote_control.sh restart

Only sessions spawned after the restart get auto mode.

Restarting ends the processes of every open session. Worktrees, branches and
transcripts on disk are untouched, but a feature session that is mid-task has
to be told to finish or hand over first. Check `git -C /opt/huxa-dev/<topic>
status` for uncommitted edits before restarting.

### 2. Tune the allow list after a week

Run `/fewer-permission-prompts` in a server session. It reads the transcripts
and proposes allow rules from what was approved by hand, writes them to
`.claude/settings.json`; commit and push the result on main.
