# handing-off-dev-servers

[English](README.md) · **Français**

Passer la main des serveurs de dev d'une session Claude Code à une autre, sans couper les serveurs de personne d'autre.

## Pour qui

Tu fais tourner **plusieurs sessions Claude Code en parallèle**, chacune dans son worktree, et leurs apps écoutent sur **les mêmes ports**. Pour tester la branche d'une autre session, il faut que celle-ci coupe ses serveurs, puis que l'autre lance les siens.

## Ce qu'il fait

1. Il liste les processus lancés depuis **le lieu de travail courant** (le dépôt ou le worktree), repérés par leur répertoire courant, et non par leur nom ou par leur port. Il exclut les worktrees imbriqués, l'outillage Claude, les terminaux et les applications.
2. Il coupe les serveurs en écoute **et leurs lanceurs** (un `tsx watch` ou un `nodemon` laissé en vie relancerait l'enfant), puis vérifie qu'il ne reste rien.
3. Il prévient la session destinataire (`SendMessage`) : les ports libérés, ce qui reste allumé et partagé (une base, un proxy), et si la branche par défaut vient de bouger.

## Quand l'utiliser

Seulement sur demande : « coupe tes serveurs, l'autre session va lancer les siens ».

## Installation

```bash
npx skills add jordantaillefer/skills --skill handing-off-dev-servers
```

Le script de listage est dans `scripts/list-own-servers.sh`. Tu peux aussi le lancer seul, depuis un dépôt : il est en lecture seule.

**macOS uniquement** : le script vise le bash 3.2 livré avec macOS et s'appuie sur `lsof` et `ps`. Il faut aussi une version de Claude Code qui propose `ListAgents` et `SendMessage`.

## Ce qu'il ne fait pas

- Il ne fait jamais de `pkill -f vite` ni de `kill $(lsof -ti:3000)` : ces commandes couperaient les serveurs de l'autre session.
- Il ne touche jamais à une base partagée (`docker stop`) ni au proxy commun.
- Il ne relance rien lui-même après la passation.
- Il ne devine jamais la session destinataire : il te la demande.
