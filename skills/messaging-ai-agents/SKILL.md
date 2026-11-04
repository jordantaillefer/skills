---
name: messaging-ai-agents
description: À utiliser quand l'utilisateur demande de transmettre un message, une question ou un travail à un autre agent IA — une autre session Claude Code ou une session Codex CLI — et d'en rapporter la réponse : « dis à codex… », « demande à l'autre session… », « fais générer ça par codex », « préviens l'autre Claude ».
---

# Transmettre un message à un agent IA

**Principe :** trois entrées — le **type** d'agent, son **nom**, l'**action**. On ne devine jamais le destinataire, et on avance **pas à pas** : un message, une réponse rapportée à l'utilisateur, qui décide de la suite.

`<dossier du skill>` est le dossier où ce `SKILL.md` est installé : résous-le avant de lancer un script.

## 1. Le destinataire

| Type | Lister les sessions | Désigner |
|---|---|---|
| Claude | `ListAgents` | son nom |
| Codex | `bash <dossier du skill>/scripts/codex-sessions.sh [filtre]` — nom, id, répertoire, dernière activité | son nom exact, ou son id |

- Nom donné par l'utilisateur : l'utiliser. Type non précisé : chercher le nom des deux côtés.
- Sinon, ou plusieurs candidats : `AskUserQuestion` avec les sessions listées. Un nom ne dit pas forcément le lieu ni la branche : ne jamais choisir à sa place.
- Une session Codex sans nom ne se désigne que par son id : proposer à l'utilisateur de la nommer (`/rename` dans Codex).

## 2. L'action

| Preset | Le message | Au retour |
|---|---|---|
| **Message libre** | Le texte de l'utilisateur | Relayer la réponse |
| **Déléguer un travail** | Le livrable, où le poser, ses contraintes (format, taille…), et « termine en donnant le chemin des fichiers produits » | Vérifier, puis rendre compte (§ 4) |
| **Passation des serveurs de dev** | Rédigé par le skill `handing-off-dev-servers` | Relayer la confirmation |

Le destinataire ne voit rien de cette conversation : le message se suffit à lui-même, sa première ligne dit de quoi il s'agit, il nomme l'émetteur (« la session Claude de `<lieu>`, pour l'utilisateur »). Les chemins sont absolus — l'autre agent travaille dans son propre répertoire — et en clair : un `@chemin` n'attache rien.

## 3. Envoyer et attendre

**Claude :** `SendMessage` avec `notify_when_idle: true`. La réponse arrive en `<cross-session-message>`, la fin de son tour en notice de repos.

**Codex :** il ne peut pas écrire à Claude ; on lit sa réponse dans l'historique de sa session.

```bash
bash <dossier du skill>/scripts/codex-send.sh "<nom-ou-id>" "<message>"
```

Le script met le message en file (`codex queue`) et affiche une commande `codex-wait.sh` : la lancer avec Bash `run_in_background`. Elle rend une seule notification — la réponse finale de Codex, ou un délai dépassé (30 min par défaut, 3ᵉ argument en secondes).

## 4. Rendre compte

- Rapporter la réponse, fidèlement et sans la réécrire.
- **Déléguer un travail :** vérifier ce qui est vérifiable — les fichiers existent ; format, dimensions et transparence **mesurés** (`file`, `sips -g pixelWidth -g pixelHeight -g hasAlpha`), car `Read` peut afficher un fond transparent en blanc ; le contenu regardé avec `Read` — puis présenter le résultat et les éventuels défauts. **Ne jamais renvoyer de soi-même** : l'utilisateur choisit — correction (nouveau message), demande suivante ou arrêt.
- **Délai dépassé :** dire l'état que le script rapporte. Ne pas renvoyer le message : il est peut-être encore en file, il partirait deux fois.

## Erreurs courantes

| Erreur | Conséquence |
|---|---|
| `codex queue --resume`, `codex exec resume`, `claude --resume` | Un second processus sur la même session que celle déjà ouverte. |
| Attendre « le prochain `task_complete` » | Prend pour la réponse un tour que l'utilisateur a lancé à la main. |
| Taper dans le terminal de l'autre agent (`osascript`, `tmux send-keys`) | Texte injecté au milieu d'un tour en cours. |
| Relancer Codex après une vérification ratée | Décide à la place de l'utilisateur. |
| Envoyer à une session devinée | Le travail part dans le mauvais projet. |
