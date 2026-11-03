# messaging-ai-agents

**English** · [Français](README.fr.md)

Pass a message, a question or a piece of work to another AI agent — another Claude Code session or a Codex CLI session — and bring its answer back.

> The `SKILL.md` is written in French. Claude Code follows it fine and answers in your language.

## Who it is for

You run **several agents side by side** and you are tired of being the mailman: copying prompts from Claude into Codex one by one, then telling Claude "it's done".

## What it does

It takes three inputs: the **agent type**, its **name**, and the **action**.

| Action | What happens on return |
|---|---|
| Free message | The answer is relayed to you. |
| Delegate a piece of work (e.g. "generate this sprite") | Claude checks what can be checked — files exist, format, size, a look at the image — then shows you the result. It never sends a correction on its own: you decide what comes next. |
| Dev server handoff | Written by [`handing-off-dev-servers`](../handing-off-dev-servers), relayed here. |

- **Claude**: `SendMessage` with an idle notice.
- **Codex**: Codex cannot write to Claude, so Claude reads the answer instead. `codex-send.sh` queues the message (`codex queue`), and `codex-wait.sh` follows the session history until the turn **opened by that message** ends, then prints Codex's final answer. A turn you start by hand in the Codex terminal is not mistaken for the answer.

It never guesses the recipient: given a name, it uses it; otherwise it lists the sessions and asks you.

## Installation

```bash
npx skills add jordantaillefer/skills --skill messaging-ai-agents
```

**macOS or Linux, bash and `jq`.** For Codex: Codex CLI with `codex queue` (0.166.0 or later). The scripts read `~/.codex/session_index.jsonl` and `~/.codex/sessions/`, an undocumented format that may change. Name your Codex sessions (`/rename`) to address them by name.

## What it does not do

- It never resumes a session in a second process (`codex queue --resume`, `codex exec resume`, `claude --resume`) while it is open elsewhere.
- It never types into another agent's terminal (`osascript`, `tmux send-keys`).
- It never re-sends a message after a timeout: it may still be queued.
