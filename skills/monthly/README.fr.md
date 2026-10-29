# monthly

[English](README.md) · **Français**

Le bilan d'un mois de travail, rédigé pour une slide de reporting lue par la direction ou les parties prenantes.

## Ce qu'il fait

- Il lit tes commits du mois sur toutes les branches et tous les worktrees, ainsi que tes PR mergées.
- Il regroupe le travail en **2 à 6 grandes fonctionnalités métier**, avec 2 à 4 impacts chacune et leurs tickets.
- Il écrit pour un public non technique : ce que ça change pour l'utilisateur, pas comment c'est codé.

## Quand l'utiliser

En fin de mois, pour remplir la slide « réalisations » d'un comité ou d'un reporting client.

## Installation et lancement

```bash
npx skills add jordantaillefer/skills --skill monthly
```

Puis, dans le dépôt : `/monthly` (le skill te propose le mois précédent ou le mois en cours), ou `/monthly mars`, `/monthly 2026-02`, `/monthly precedent`.

Il faut `git` et, pour les PR, `gh` connecté.

## Ce qu'il ne fait pas

- Il ne modifie aucun fichier et ne commite rien : il est en lecture seule.
- Il ne liste pas les PR une par une : il synthétise.
