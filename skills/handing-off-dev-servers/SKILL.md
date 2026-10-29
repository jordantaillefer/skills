---
name: handing-off-dev-servers
description: À utiliser quand l'utilisateur demande de couper les serveurs de dev de cette session pour qu'une autre session Claude lance les siens — tester une autre branche ou un autre worktree sur les mêmes ports — ou de prévenir une autre session qu'elle peut démarrer ses serveurs.
---

# Passer la main des serveurs de dev

**Principe :** on ne coupe que ce qui a été lancé depuis **son propre lieu de travail**, identifié par le répertoire courant des processus — jamais par un nom (`pkill -f vite`) ni par un port. Un port occupé peut appartenir à la session à qui l'on passe la main.

Ne s'applique que sur demande explicite de l'utilisateur. Après la passation, on ne relance rien soi-même.

## 1. Lister

```bash
bash <dossier du skill>/scripts/list-own-servers.sh
```

`<dossier du skill>` est le dossier où ce `SKILL.md` est installé (`~/.claude/skills/handing-off-dev-servers` pour une installation globale, `.claude/skills/handing-off-dev-servers` dans un projet) : résous-le avant de lancer la commande.

Le script part du dépôt ou worktree courant, exclut les worktrees imbriqués, l'outillage Claude (MCP), les terminaux et les applications. Il rend deux sections.

## 2. Couper

| Section | Action |
|---|---|
| **Serveurs** (en écoute + lanceurs) | `kill` sur **tous** les PID listés, lanceurs compris : un `tsx watch` ou `nodemon` laissé en vie relance l'enfant. |
| **Autres**, orphelin (PPID 1) qui est un serveur de dev (`tsx watch`, `vite`, `expo`, `next dev`, `nodemon`…) | Le couper aussi, et le signaler. |
| **Autres**, tout le reste (boucle de surveillance, build, script) | Ne pas toucher ; le mentionner. |
| Les deux sections vides | Rien à couper. Le dire, ne pas chercher ailleurs. |

Si l'utilisateur a nommé des ports que le script ne rattache pas à ce lieu : ne pas les libérer. Dire à qui ils appartiennent (`lsof -nP -iTCP:<port> -sTCP:LISTEN`, puis `lsof -a -p <pid> -d cwd`) — c'est souvent déjà la session destinataire.

Jamais : `docker stop` d'une base partagée, le proxy commun (portless, caddy…), un processus d'un autre lieu.

**Vérifier :** relancer le script après 2–3 s — section serveurs vide. Survivant : `kill -9` sur ce seul PID.

## 3. Choisir le destinataire

- Nom donné par l'utilisateur : l'utiliser.
- Sinon : `ListAgents`, puis `AskUserQuestion` avec les sessions candidates. Les noms ne disent ni le lieu ni la branche : ne jamais deviner.

## 4. Envoyer

`SendMessage` avec `notify_when_idle: true`. Le message contient, dans cet ordre :

1. Première ligne autonome : « Serveurs de `<lieu>` coupés : lance les tiens[ sur `<branche>`]. »
2. Qui le demande : l'utilisateur, relayé par la session de `<lieu>` (`<branche>`).
3. Les ports libérés.
4. Ce qui reste allumé et partagé (base, proxy).
5. Si la branche par défaut vient de bouger dans cette session (merge) : le dire, pour qu'elle rebase.

Pas de PID : ils ne servent à rien de l'autre côté.

## 5. Rendre compte

À l'utilisateur : ce qui a été coupé, ce qui a été laissé et pourquoi, le message remis. À la notification de repos de l'autre session, relayer sa confirmation — un envoi réussi ne prouve pas qu'elle a lancé.

## Erreurs courantes

| Erreur | Conséquence |
|---|---|
| `pkill -f expo` / `kill $(lsof -ti:3001)` | Coupe les serveurs de l'autre session. |
| Tuer seulement le PID en écoute | Le watcher le relance. |
| Filtrer par parent (PPID) plutôt que par répertoire | Rate les orphelins de sessions précédentes. |
| Filtrer `cwd` sous le dépôt principal sans exclure `.claude/worktrees/` | Coupe les serveurs des worktrees. |
| Envoyer à une session devinée | Elle relance des serveurs sur la mauvaise branche. |
