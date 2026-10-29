# daily

[English](README.md) · **Français**

Le bilan de ton activité git sur une période, prêt à lire au daily standup.

## Ce qu'il fait

- Il lit tes commits sur **toutes les branches et tous les worktrees** (`git log --all --author`), ainsi que tes PR mergées (`gh pr list`).
- Il les regroupe par branche ou par thème, avec le ticket et la PR quand ils sont visibles.
- Il rend un résumé **court** (une ligne par thème, à coller dans Slack) ou **détaillé** (des puces par thème).

## Quand l'utiliser

Avant un daily, ou pour retrouver ce que tu as fait depuis lundi.

## Installation et lancement

```bash
npx skills add jordantaillefer/skills --skill daily
```

Puis, dans le dépôt : `/daily` (le skill te demande la période et le format), ou directement `/daily 3j`, `/daily lundi`, `/daily 2026-03-28 10:00`.

Il faut `git` et, pour les PR, `gh` connecté.

## Ce qu'il ne fait pas

- Il ne modifie aucun fichier et ne commite rien : il est en lecture seule.
- Il ne voit que les commits signés de ton `git config user.name`.
