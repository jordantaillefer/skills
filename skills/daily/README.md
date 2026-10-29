# daily

**English** · [Français](README.fr.md)

A summary of your git activity over a period, ready to read at the daily standup.

> The `SKILL.md` is written in French. Claude Code follows it fine and answers in your language.

## What it does

- It reads your commits across **every branch and every worktree** (`git log --all --author`), plus your merged PRs (`gh pr list`).
- It groups them by branch or theme, with the ticket and the PR when they are visible.
- It returns a **short** summary (one line per theme, ready to paste into Slack) or a **detailed** one (bullets per theme).

## When to use it

Before a standup, or to recall what you have done since Monday.

## Install and run

```bash
npx skills add jordantaillefer/skills --skill daily
```

Then, in the repository: `/daily` (the skill asks for the period and the format), or directly `/daily 3j` (3 days), `/daily lundi` (since Monday), `/daily 2026-03-28 10:00`.

You need `git` and, for PRs, an authenticated `gh`.

## What it does not do

- It changes no files and makes no commits: it is read-only.
- It only sees commits authored under your `git config user.name`.
