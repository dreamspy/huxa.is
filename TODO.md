# TODO

## Stop the permission prompts in Remote Control sessions

The `claude remote-control` spawner on the server runs with
`--permission-mode acceptEdits`. That mode auto-approves file edits only, so
every Bash call (git, preview.sh, npm, curl) still asks for confirmation on
the phone. A second bare `claude remote-control` process is also running with
no mode flag, so sessions spawned from it prompt for edits as well.

### 1. Restart remote-control with a looser mode

Over SSH, or in the tmux window where it was started, stop both running
`claude remote-control` processes, then start a single one:

    claude remote-control --spawn=same-dir --permission-mode auto --remote-control-session-name-prefix huxa

`auto` lets a classifier approve routine commands and only asks for risky
ones (destructive git, deletes outside the repo). For no prompts at all use
`--permission-mode bypassPermissions` instead; the trade-off is that a wrong
`git push --force` or `rm -rf` runs without a check.

The mode only applies to sessions spawned after the restart. Already open
sessions keep `acceptEdits`.

### 2. Add an allowlist in settings

Independent of the mode, rules in `/home/huxadev/.claude/settings.json`
approve matching commands silently:

    {
      "permissions": {
        "allow": [
          "Bash(git *)",
          "Bash(/opt/huxa/05_scripts/preview.sh *)",
          "Bash(npx expo *)",
          "Bash(curl *)"
        ]
      }
    }

Running `/fewer-permission-prompts` in a session scans the transcripts and
proposes this list from what was actually approved.

Recommended: do both. Restart with `auto`, and allowlist git and the preview
script so even `auto` never pauses on them.
