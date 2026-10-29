# monthly

**English** · [Français](README.fr.md)

A summary of a month of work, written for a reporting slide read by management or stakeholders.

> The `SKILL.md` is written in French. Claude Code follows it fine and answers in your language.

## What it does

- It reads your commits for the month across every branch and worktree, plus your merged PRs.
- It groups the work into **2 to 6 major business features**, with 2 to 4 impacts each and their tickets.
- It writes for a non-technical audience: what changes for the user, not how it is coded.

## When to use it

At the end of the month, to fill in the "achievements" slide of a steering committee or client report.

## Install and run

```bash
npx skills add jordantaillefer/skills --skill monthly
```

Then, in the repository: `/monthly` (the skill offers last month or the current one), or `/monthly mars` (March), `/monthly 2026-02`, `/monthly precedent` (last month).

You need `git` and, for PRs, an authenticated `gh`.

## What it does not do

- It changes no files and makes no commits: it is read-only.
- It does not list PRs one by one: it summarizes.
