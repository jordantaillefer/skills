---
name: daily
description: Bilan des commits sur une periode donnee, regroupe par branche/theme avec resume structure pour daily standup
disable-model-invocation: false
argument-hint: [depuis quand, ex: "3j", "lundi", "2026-03-28 10:00"]
---

# Daily - Bilan d'activite

Resume le travail realise sur une periode donnee en analysant le git log de toutes les branches.

## Flow

### 1. Determiner la periode

**Si aucun argument n'est passe** : proposer les choix suivants via `AskUserQuestion` (en une seule fois, 2 questions) :

**Question 1 — Periode** :
- Option 1 : **Daily standup** (hier 14h -> aujourd'hui 14h)
- Option 2 : **Depuis une date** (l'utilisateur saisit dans "Other" : ex: `3j`, `lundi`, `2026-03-28 10:00`)

**Question 2 — Format** :
- Option 1 : **Court** — une ligne par theme : `{ticket} - {description courte} (PR #{num} mergee/en cours)`
- Option 2 : **Detaille** — bullet points par theme avec detail des changements (format par defaut)

**Si un argument est passe** (ex: `/daily 3j`, `/daily lundi`, `/daily 2026-03-25`) : l'utiliser directement comme date de debut, fin = maintenant.

**Conversion des arguments courants :**
- `1j`, `2j`, `3j`... -> `X days ago`
- `lundi`, `mardi`... -> `last Monday`, `last Tuesday`...
- Une date ISO ou date/heure -> utiliser telle quelle
- `semaine` -> `last Monday`

### 2. Collecter les commits et PR

**Commits :** lancer cette commande git :

```bash
git log --author="$(git config user.name)" --since="{debut}" --until="{fin}" --format="%h|%s|%D|%ai" --no-merges --all
```

- `--all` : inclut toutes les branches (locales + remote) et tous les worktrees
- `--no-merges` : exclut les merge commits
- `--author` : filtre sur l'utilisateur courant (detecte via `git config user.name`)

**PR mergees :** lancer en parallele cette commande gh :

```bash
gh pr list --author="@me" --state=merged --search="merged:>={debut_ISO}" --json number,title,headRefName,mergedAt
```

Cela permet de recuperer les PR mergees sur la periode, meme si les merge commits sont exclus du git log. Croiser les PR avec les branches des commits pour les rattacher aux bons groupes.

Si aucun commit et aucune PR trouves, indiquer "Aucune activite sur cette periode" et s'arreter.

### 3. Regrouper et analyser

Regrouper les commits par **branche/theme** en utilisant les refs et les prefixes de message pour identifier les groupes logiques.

Pour chaque groupe, identifier :
- Le nom de la branche ou du theme
- Le ticket associe (ex: ABC-123) s'il est visible dans la branche ou les messages
- Le numero de PR si un commit mentionne `(#123)`
- Si la PR a ete mergee (visible via les refs sur dev/main)

### 4. Generer le resume

#### Format court

```
## Bilan {date_debut} -> {date_fin} ({nombre} commits)

- {Ticket} - {Description courte} — PR #{num} mergee / en cours
- {Ticket} - {Description courte} — PR #{num} mergee / en cours
- ...

**Total : X commits, Y branches, Z PR**
```

Une ligne par theme/branche. Ideal pour copier-coller dans Slack ou un daily rapide.

#### Format detaille

```
## Bilan {date_debut} -> {date_fin} ({nombre} commits)

### {Ticket} - {Theme/Description}
- {Resume des changements en bullet points concis}
- {Chaque bullet = un changement significatif, pas un commit}
- PR #{numero} {mergee/en cours} (si applicable)

### {Autre theme}
- ...
```

**Regles de redaction (format detaille) :**
- Regrouper les commits lies en un seul bullet point (ex: 3 commits de fix sur le meme sujet = 1 bullet)
- Utiliser des verbes d'action a l'infinitif (ex: "Ajouter", "Corriger", "Refactoriser")
- Mentionner les PR mergees vs en cours
- Ne PAS lister chaque commit individuellement — synthetiser par theme

**Regles communes aux deux formats :**
- Terminer par un compteur total : `**Total : X commits, Y branches, Z PR**`
- Le resume doit etre assez concis pour etre lu en 1-2 minutes au daily

### Regles importantes

- Ne JAMAIS modifier de fichiers ou faire de commits — ce skill est en lecture seule
- Utiliser `--all` pour capturer le travail de tous les worktrees
- Si `git config user.name` est vide, demander le nom a l'utilisateur
- Les heures sont en heure locale
