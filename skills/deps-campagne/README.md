# deps-campagne

**English** · [Français](README.fr.md)

A dependency upgrade campaign, run every two weeks, that replaces Dependabot. It bumps dependencies, reads the breaking changes, checks what they touch in your code, and opens **a single PR** that works as a to-do list.

The PR is allowed to be red. The goal is **readable red**: what breaks, why, and what is left to check. You read, decide and merge.

> The `SKILL.md` is written in French. Claude Code follows it fine and answers in your language.

## What it does

A deterministic Node engine does the mechanical work:
- it creates the `deps/campagne-<date>` branch;
- it makes **one commit per bump** (the in-range batch, then each pin or major, with coupled packages together);
- after each commit, it runs a fast oracle (install + `tsc`), then, if that passes, a full oracle (lint, tests, `pnpm audit`);
- it puts every override on a test bench: it removes it, forces re-resolution, and checks whether anything changes;
- it checks quarantine exclusions (`minimumReleaseAge`) and dependencies installed from outside the registry;
- it writes everything to `.deps-campagne/report.json`.

Then the skill does the judgment work:
- it fetches the previous campaign's PR;
- it runs **one agent per major**, in parallel, each with its own context;
- it has every hypothesis challenged by a fresh agent;
- it updates `DEPENDENCIES.md`;
- it opens the PR.

## The four ideas

1. **One commit per bump.** When a commit breaks the oracle, you know which one. Red inherited from the previous commit does not count: only a new failure signature makes a major "blocking".
2. **One agent per major.** The scarce resource is not cost, it is context. Seven agents reading one changelog each do better work than one agent reading seven.
3. **PROVEN or HYPOTHESIS.** What the oracle establishes is proven. What a changelog says stays a hypothesis, with no ✅ and no "safe", until a fresh agent has tried to refute it. Refuted hypotheses stay in the PR, under "Ruled out".
4. **The previous campaign is the memory.** You do not reread the same changelogs every two weeks to reach the same conclusions. And the code is checked to confirm last time's to-do list was actually done.

Every unit of work (a major, an override, a failing commit) gets a verdict, or a line in the PR's **Not covered** section. Nothing disappears silently.

## When to use it

Every two weeks or so, or whenever you want to bring a monorepo up to date without a stream of Dependabot PRs. It pays off most on projects with overrides, pins and exceptions whose reasons nobody remembers.

## The stack is fixed

**pnpm (monorepo), TypeScript, git and `gh`**, Node ≥ 24. The engine calls `pnpm outdated`, `pnpm why`, `pnpm audit` and `tsc`, and reads `pnpm-workspace.yaml` and `pnpm-lock.yaml`. There is no npm or yarn adapter: on another stack, you will need to adapt the engine.

## Installation

In your project, at the monorepo root:

```bash
npx skills add jordantaillefer/skills --skill deps-campagne
pnpm add -Dw semver
```

Pick the **project** install (not global) if `npx skills add` asks: the engine finds `semver` by walking up to the project's `node_modules`.

Add these two scripts to the root `package.json` (the path assumes an install in `.claude/skills/`):

```json
"deps:campagne": "node .claude/skills/deps-campagne/engine/run.mjs",
"deps:quarantaine": "node .claude/skills/deps-campagne/engine/verifier-quarantaine.mjs"
```

Copy `deps-campagne.config.example.json` to the project root as `deps-campagne.config.json`, and fill it in. If you do not have a `DEPENDENCIES.md` yet, start from `DEPENDENCIES.example.md`.

Add `.deps-campagne/` to your `.gitignore` (the engine writes its report there), then **commit** the config, the scripts and the skill: the engine refuses to start on a dirty working tree.

Then, in Claude Code: `/deps-campagne`.

## The config

The keys are in French, like the engine.

| Key | Purpose |
|---|---|
| `workspaces` | **Required.** The scope: every workspace in the monorepo. A forgotten workspace keeps its old versions while the others move up, and two copies of the same dependency end up in a single `tsc` program. |
| `workspaces[].typage` | If present, the fast oracle runs `tsc` on this workspace. `prepare`: a codegen step to run first (`["prisma", "generate"]`). `purger`: a `.tsbuildinfo` to delete, otherwise the incremental cache gives a false green. `commande`: `["tsc", "--noEmit"]` by default. |
| `workspaces[].lint`, `workspaces[].test` | The full oracle's commands, as argv, run from the root. If they are missing, the step is skipped. |
| `workspaces[].env` | Environment variables for those commands. Only put dummy values here. |
| `prealables` | Services that must answer before starting: `{ nom, hote, port, pourquoi }`. The engine checks the TCP port and never starts a container. |
| `groupesCouples` | Packages that move together: `{ nom, prefixe }` or `{ nom, paquets: [...] }`. |
| `cheminsCommit` | What the engine stages for each commit, and what the test bench restores. Default: whichever of `package.json`, `pnpm-lock.yaml`, `apps` and `packages` exist. A declared path that is missing is rejected. |
| `pr` | `base` (default `main`) and `titre` (default `chore(deps): campagne du`). The title is also how the previous campaign is found. |
| `fichierDependances` | Default `DEPENDENCIES.md`. |

If the config is missing or invalid, the engine refuses to start and says which key to fix.

## What it does not do

- **It never merges**, and never pushes to the base branch.
- **It never changes application code.** It bumps dependencies and writes `DEPENDENCIES.md`, nothing else.
- **It never touches Docker**: if a database is down, it asks you to start it.
- It never drops a bump to make the tests pass: a red commit is information.
- It cannot see anything outside pnpm (Python, Go…), and says so in the PR.

## Credit

Several mechanisms come from [Cloudflare's security-audit-skill](https://github.com/cloudflare/security-audit-skill) (MIT), adapted to dependencies: the previous campaign as memory, the list of units written before dispatch (hence the "Not covered" section), refutation by a fresh agent, and the enforced JSON output, which stops a hypothesis from carrying a verdict. Only the ideas are reused: no text is copied.

## Tests

From the root of this repository: `pnpm install && pnpm test`.
