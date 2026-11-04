# TODO

## Stop the permission prompts in Remote Control sessions

Done 4 Nov 2026: `.claude/settings.json` is committed on main. It sets auto
mode, puts `/opt/huxa-dev` in scope so worktree edits stop prompting, allows
git, preview.sh, Expo, npm and curl, keeps force pushes, hard resets and
deploy.sh on the ask list, and denies writes to `/var/lib/huxa`, `/etc` and
sudo. The Remote Control server was restarted the same day without the
`--permission-mode acceptEdits` flag it used to carry (a flag on the command
line overrides `defaultMode` in settings), so new sessions start in auto mode.
A reminder for the step below fires in the integrator session on 11 Nov 2026.

### Tune the allow list after a week

Run `/fewer-permission-prompts` in a server session. It reads the transcripts
and proposes allow rules from what was approved by hand, writes them to
`.claude/settings.json`; commit and push the result on main.
