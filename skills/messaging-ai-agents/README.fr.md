# messaging-ai-agents

[English](README.md) · **Français**

Transmettre un message, une question ou un travail à un autre agent IA (une autre session Claude Code, ou une session Codex CLI) et en rapporter la réponse.

## Pour qui

Tu fais tourner **plusieurs agents côte à côte** et tu en as assez de faire le facteur : copier les prompts de Claude dans Codex un par un, puis dire à Claude « il a fini ».

## Ce qu'il fait

Il prend trois entrées : le **type** d'agent, son **nom** et l'**action**.

| Action | Au retour |
|---|---|
| Message libre | La réponse t'est relayée. |
| Déléguer un travail (par ex. « génère ce sprite ») | Claude vérifie ce qui est vérifiable (fichiers présents, format, taille, un coup d'œil à l'image), puis te montre le résultat. Il ne renvoie jamais de correction de lui-même : c'est toi qui décides de la suite. |
| Passation des serveurs de dev | Rédigée par [`handing-off-dev-servers`](../handing-off-dev-servers), relayée ici. |

- **Claude** : `SendMessage`, avec un avis quand la session a fini.
- **Codex** : Codex ne peut pas écrire à Claude, c'est donc Claude qui lit sa réponse. `codex-send.sh` met le message en file (`codex queue`), et `codex-wait.sh` suit l'historique de la session jusqu'à la fin du tour **ouvert par ce message**, puis affiche la réponse finale de Codex. Un tour que tu lances toi-même dans le terminal Codex n'est pas pris pour la réponse.

Il ne devine jamais le destinataire : si tu donnes un nom, il l'utilise ; sinon, il liste les sessions et te demande.

## Installation

```bash
npx skills add jordantaillefer/skills --skill messaging-ai-agents
```

**macOS ou Linux, bash et `jq`.** Pour Codex : Codex CLI avec `codex queue` (0.166.0 ou plus récent). Les scripts lisent `~/.codex/session_index.jsonl` et `~/.codex/sessions/`, dont le format n'est pas documenté et peut changer. Nomme tes sessions Codex (`/rename`) pour les désigner par leur nom.

## Ce qu'il ne fait pas

- Il ne reprend jamais une session dans un second processus (`codex queue --resume`, `codex exec resume`, `claude --resume`) pendant qu'elle est ouverte ailleurs.
- Il ne tape jamais dans le terminal d'un autre agent (`osascript`, `tmux send-keys`).
- Il ne renvoie jamais un message après un délai dépassé : il est peut-être encore en file.
