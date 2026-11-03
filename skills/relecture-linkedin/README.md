# relecture-linkedin

**English** · [Français](README.fr.md)

A strict editor for your LinkedIn drafts in Gecko Social. It reads a draft, tears it apart against your own post history, and keeps going until the post is as good as it can be, or until you decide it is not worth publishing.

> The `SKILL.md` is written in French. Claude Code follows it fine and answers in your language.

## What it does

- It reads the draft (text, image, planned comment) and your posts from the last 18 months, with their impressions.
- It hands everything to a **fresh subagent** that never saw the conversation where the post was written, so it has no reason to be kind.
- The reviewer returns a fixed JSON: a verdict (`publiable`, `à retravailler`, `à jeter`), the past posts this one resembles and how they did, what the reader actually learns, the hook, **every weak sentence quoted word for word** with a category and a rewrite, the objections an expert will post in the comments, and any break of your own rules.
- `publiable` is impossible while a blocking point remains. No impression forecast is ever made up: only real numbers from your history.
- You pick the rewrites; it applies only those to the Gecko draft, reads the draft back from Gecko, and runs a new fresh reviewer. Again, until the verdict is `publiable` or you overrule it.
- It ships with a list of hollow LinkedIn phrasings (`tournures-bannies.md`, in French) that grows as reviews find new ones.

## When to use it

Before scheduling any post. Or from your own posting skill, right before asking for approval.

## Install and run

```bash
npx skills add jordantaillefer/skills --skill relecture-linkedin
```

You need the **Gecko Social MCP** connected in Claude Code.

Then: `/relecture-linkedin` (latest draft), `/relecture-linkedin <postId>`, or `/relecture-linkedin <postId> path/to/style-rules.md path/to/published-posts.md` to have your own rules checked too.

## What it does not do

- It never creates, schedules or publishes a post, and never adds a comment.
- It never edits the draft without your explicit yes on each rewrite.
- It does not write posts from scratch.
