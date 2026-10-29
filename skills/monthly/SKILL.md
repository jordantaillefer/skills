---
name: monthly
description: Bilan mensuel des realisations fonctionnelles, regroupe par grandes fonctionnalites avec impacts majeurs, pour alimenter une slide de reporting
disable-model-invocation: false
argument-hint: [mois, ex: "mars", "2026-02", "precedent"]
---

# Monthly - Bilan mensuel des realisations fonctionnelles

Genere un bilan mensuel structure par grandes fonctionnalites avec leurs impacts majeurs, dans un format adapte pour remplir une slide de reporting.

## Flow

### 1. Determiner le mois

**Si aucun argument n'est passe** : proposer les choix suivants via `AskUserQuestion` (1 question) :

**Question — Mois** :
- Option 1 : **Le mois precedent** (ex: si on est en avril, analyser mars)
- Option 2 : **Le mois en cours** (depuis le 1er du mois jusqu'a maintenant)

L'utilisateur peut aussi saisir un mois specifique dans "Other" (ex: `janvier`, `2026-02`, `fevrier 2026`).

**Si un argument est passe** (ex: `/monthly mars`, `/monthly 2026-02`, `/monthly precedent`) : l'utiliser directement.

**Conversion des arguments courants :**
- `precedent` -> mois precedent
- `janvier`, `fevrier`, `mars`... -> mois correspondant de l'annee en cours (ou precedente si le mois est dans le futur)
- `2026-02` ou `fevrier 2026` -> mois et annee specifies

**Calculer les bornes :**
- `debut` = 1er jour du mois a 00:00
- `fin` = dernier jour du mois a 23:59 (ou maintenant si mois en cours)

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
gh pr list --author="@me" --state=merged --search="merged:{debut_ISO}..{fin_ISO}" --json number,title,headRefName,mergedAt --limit 100
```

Si aucun commit et aucune PR trouves, indiquer "Aucune activite sur ce mois" et s'arreter.

### 3. Regrouper par grandes fonctionnalites

**Niveau de synthese :** un mois contient potentiellement beaucoup de commits. L'objectif n'est PAS de lister chaque branche ou PR, mais de **regrouper le travail en grandes fonctionnalites metier**.

**Methode de regroupement :**
1. Identifier les tickets/themes recurrents dans les branches et messages de commit
2. Regrouper les branches/PR qui contribuent a la meme fonctionnalite (ex: plusieurs PR pour ABC-123 = une seule fonctionnalite)
3. Fusionner les corrections, refactors et fixes lies a une meme fonctionnalite
4. Les petits fixes ou taches techniques isolees peuvent etre regroupes sous un theme "Corrections et maintenance"

**Pour chaque grande fonctionnalite, identifier :**
- Un titre clair et orienté metier (pas technique) — ex: "Création du panel administrateur" plutot que "feat: admin panel"
- 2 a 4 sous-points decrivant les **impacts majeurs** de cette fonctionnalite (ce que ca change pour l'utilisateur ou le produit)
- Les tickets associes (ABC-XXX)

### 4. Generer le resume au format slide

```
## Realisations fonctionnelles — Mois : {Nom du mois}

### {Titre fonctionnalite 1} ({tickets})
- {Impact majeur 1 : description orientee valeur/utilisateur}
- {Impact majeur 2}
- {Impact majeur 3 si pertinent}

### {Titre fonctionnalite 2} ({tickets})
- {Impact majeur 1}
- {Impact majeur 2}

### Corrections et maintenance
- {Resume des fixes et refactors significatifs}

---
**Total : X commits, Y PR mergees**
```

**Regles de redaction :**
- **Orienté metier, pas technique** : decrire CE QUE ca apporte, pas COMMENT c'est fait. Ex: "Permettre aux administrateurs de modifier les fiches produits" plutot que "Ajouter un formulaire CRUD avec validation Zod"
- **2 a 6 grandes fonctionnalites max** : si plus, regrouper davantage. La slide doit etre lisible d'un coup d'oeil
- **2 a 4 sous-points par fonctionnalite** : chaque sous-point = un impact ou un livrable concret
- **Phrases completes et descriptives** : pas de style telegraphique, les sous-points doivent etre comprehensibles sans contexte technique
- **Ne PAS mentionner les numeros de PR** dans le corps — les tickets ABC-XXX suffisent pour la tracabilite
- **Verbes a l'infinitif** pour les sous-points (ex: "Permettre de...", "Rendre possible...", "Offrir la possibilite de...")
- Le resume doit pouvoir etre copie-colle directement dans une slide de presentation

### Regles importantes

- Ne JAMAIS modifier de fichiers ou faire de commits — ce skill est en lecture seule
- Utiliser `--all` pour capturer le travail de tous les worktrees
- Si `git config user.name` est vide, demander le nom a l'utilisateur
- Les heures sont en heure locale
- Privilegier la clarte et la concision : le public cible est non-technique (direction, stakeholders)
