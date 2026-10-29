# skills

**English** · [Français](README.fr.md)

Claude Code skills I use every day on client work. They are not demos: each one exists because I got tired of doing something by hand.

| Skill | What it does |
|---|---|
| [`deps-campagne`](skills/deps-campagne) | A dependency upgrade campaign that replaces Dependabot: one commit per bump, an oracle after each one, one agent per major, hypotheses kept apart from what is proven, and a single PR to read. pnpm monorepo + TypeScript. |
| [`daily`](skills/daily) | A summary of your commits and PRs over a period, grouped by theme, for the daily standup. |
| [`monthly`](skills/monthly) | A month of work rewritten as business features and impacts, ready for a reporting slide. |
| [`handing-off-dev-servers`](skills/handing-off-dev-servers) | Hands dev servers over from one Claude Code session to another, on the same ports, without killing anyone else's. macOS. |

## Installation

```bash
npx skills add jordantaillefer/skills --skill <name>
```

Each skill's README explains what it needs (`deps-campagne` asks for a few extra steps).

## Language

The `SKILL.md` files are written in French, which is the language I work in. Claude Code follows them fine and answers in your language. Every README exists in English and in French.

## License

[MIT](LICENSE) © 2026 Jordan Taillefer
