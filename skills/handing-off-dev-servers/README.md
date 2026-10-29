# handing-off-dev-servers

**English** · [Français](README.fr.md)

Hand the dev servers over from one Claude Code session to another, without killing anyone else's servers.

> The `SKILL.md` is written in French. Claude Code follows it fine and answers in your language.

## Who it is for

You run **several Claude Code sessions in parallel**, each in its own worktree, and their apps listen on **the same ports**. To test another session's branch, the current session has to stop its servers, then the other one starts its own.

## What it does

1. It lists the processes started from **the current workplace** (the repository or worktree), identified by their working directory, not by their name or port. It excludes nested worktrees, Claude tooling, terminals and applications.
2. It stops the listening servers **and their launchers** (a `tsx watch` or `nodemon` left alive would restart the child), then checks that nothing is left.
3. It notifies the receiving session (`SendMessage`): the freed ports, what stays up and shared (a database, a proxy), and whether the default branch has just moved.

## When to use it

Only on request: "stop your servers, the other session is going to start its own".

## Installation

```bash
npx skills add jordantaillefer/skills --skill handing-off-dev-servers
```

The listing script lives in `scripts/list-own-servers.sh`. You can also run it on its own, from a repository: it is read-only.

**macOS only**: the script targets the bash 3.2 that ships with macOS and relies on `lsof` and `ps`. You also need a Claude Code version that provides `ListAgents` and `SendMessage`.

## What it does not do

- It never runs `pkill -f vite` or `kill $(lsof -ti:3000)`: those would kill the other session's servers.
- It never touches a shared database (`docker stop`) or the common proxy.
- It does not restart anything itself after the handoff.
- It never guesses the receiving session: it asks you.
