# deps-campagne

[English](README.md) · **Français**

Une campagne d'upgrade des dépendances, à lancer toutes les deux semaines, qui remplace Dependabot. Elle monte les dépendances, lit les breaking changes, vérifie ce qu'ils touchent dans ton code, puis ouvre **une seule PR** qui sert de plan de travail.

La PR a le droit d'être rouge. Le but est de livrer du **rouge lisible** : ce qui casse, pourquoi, et ce qui reste à vérifier. C'est toi qui lis, tranches et merges.

## Ce qu'il fait

Un moteur Node déterministe fait le travail mécanique :
- il crée la branche `deps/campagne-<date>` ;
- il fait **un commit par bump** (le lot in-range, puis chaque pin ou major, les paquets couplés ensemble) ;
- après chaque commit, il joue un oracle rapide (install + `tsc`), puis, s'il passe, un oracle complet (lint, tests, `pnpm audit`) ;
- il passe chaque override au banc d'essai : il le retire, force la re-résolution et regarde si quelque chose change ;
- il vérifie les exclusions de quarantaine (`minimumReleaseAge`) et les dépendances hors registre ;
- il écrit tout dans `.deps-campagne/report.json`.

Puis le skill fait le travail de jugement :
- il récupère la PR de la campagne précédente ;
- il lance **un agent par major**, en parallèle, chacun avec son propre contexte ;
- il fait réfuter chaque hypothèse par un agent neuf ;
- il met à jour `DEPENDENCIES.md` ;
- il ouvre la PR.

## Les quatre idées

1. **Un commit par bump.** Quand un commit casse l'oracle, on sait lequel. Un rouge hérité du commit précédent ne compte pas : seule une signature d'échec nouvelle rend un major « bloquant ».
2. **Un agent par major.** La ressource rare n'est pas le coût, c'est le contexte. Sept agents qui lisent chacun un changelog travaillent mieux qu'un seul qui en lit sept.
3. **PROUVÉ ou HYPOTHÈSE.** Ce que l'oracle établit est prouvé. Ce que dit un changelog reste une hypothèse, sans ✅ ni « safe », jusqu'à ce qu'un agent neuf ait essayé de la démonter. Les hypothèses réfutées restent dans la PR, sous « Écarté ».
4. **La campagne précédente sert de mémoire.** On ne relit pas tous les quinze jours les mêmes changelogs pour retrouver les mêmes conclusions. Et on vérifie dans le code que le « Reste à faire » de la dernière fois a bien été fait.

Chaque unité de travail (un major, un override, un commit en échec) reçoit un verdict, ou une ligne dans la section **Non couvert** de la PR. Rien ne disparaît en silence.

## Quand l'utiliser

Toutes les deux semaines environ, ou quand tu veux remettre un monorepo à jour sans PR Dependabot à la chaîne. Il vaut surtout la peine sur un projet qui a des overrides, des pins et des exceptions dont plus personne ne se souvient de la raison.

## La stack est figée

**pnpm (monorepo), TypeScript, git et `gh`**, Node ≥ 24. Le moteur appelle `pnpm outdated`, `pnpm why`, `pnpm audit` et `tsc`, et lit `pnpm-workspace.yaml` et `pnpm-lock.yaml`. Il n'y a pas d'adaptateur npm ni yarn : sur une autre stack, il faut adapter le moteur.

## Installation

Dans ton projet, à la racine du monorepo :

```bash
npx skills add jordantaillefer/skills --skill deps-campagne
pnpm add -Dw semver
```

Choisis l'installation **dans le projet** (et non globale) si `npx skills add` te le demande : le moteur trouve `semver` en remontant jusqu'au `node_modules` du projet.

Ajoute ces deux scripts au `package.json` racine (le chemin suppose une installation dans `.claude/skills/`) :

```json
"deps:campagne": "node .claude/skills/deps-campagne/engine/run.mjs",
"deps:quarantaine": "node .claude/skills/deps-campagne/engine/verifier-quarantaine.mjs"
```

Copie `deps-campagne.config.example.json` à la racine du projet sous le nom `deps-campagne.config.json`, et remplis-le. Si tu n'as pas encore de `DEPENDENCIES.md`, pars de `DEPENDENCIES.example.md`.

Ajoute `.deps-campagne/` à ton `.gitignore` (c'est là que le moteur écrit son rapport), puis **commite** la config, les scripts et le skill : le moteur refuse de démarrer sur un working tree sale.

Puis, dans Claude Code : `/deps-campagne`.

## La config

| Clé | Rôle |
|---|---|
| `workspaces` | **Obligatoire.** Le périmètre : tous les workspaces du monorepo. Un workspace oublié garde ses anciennes versions pendant que les autres montent, et deux copies d'une même dépendance finissent dans un seul programme `tsc`. |
| `workspaces[].typage` | Si présent, l'oracle rapide lance `tsc` sur ce workspace. `prepare` : un codegen à jouer avant (`["prisma", "generate"]`). `purger` : un `.tsbuildinfo` à supprimer, sinon le cache incrémental rend un vert faux. `commande` : `["tsc", "--noEmit"]` par défaut. |
| `workspaces[].lint`, `workspaces[].test` | Les commandes de l'oracle complet, sous forme d'argv, lancées à la racine. Si elles sont absentes, l'étape est sautée. |
| `workspaces[].env` | Les variables d'environnement de ces commandes. N'y mets que des valeurs factices. |
| `prealables` | Les services qui doivent répondre avant de démarrer : `{ nom, hote, port, pourquoi }`. Le moteur vérifie le port TCP, et ne démarre jamais un conteneur. |
| `groupesCouples` | Les paquets qui bougent d'un seul tenant : `{ nom, prefixe }` ou `{ nom, paquets: [...] }`. |
| `cheminsCommit` | Ce que le moteur indexe à chaque commit, et ce que le banc d'essai restaure. Par défaut : ceux de `package.json`, `pnpm-lock.yaml`, `apps` et `packages` qui existent. Un chemin déclaré mais absent est refusé. |
| `pr` | `base` (par défaut `main`) et `titre` (par défaut `chore(deps): campagne du`). Le titre sert aussi à retrouver la campagne précédente. |
| `fichierDependances` | Par défaut `DEPENDENCIES.md`. |

Si la config est absente ou invalide, le moteur refuse de démarrer et dit quelle clé corriger.

## Ce qu'il ne fait pas

- **Il ne merge jamais**, et ne pousse jamais sur la branche de base.
- **Il ne modifie jamais le code applicatif.** Il bump des dépendances et écrit `DEPENDENCIES.md`, c'est tout.
- **Il ne touche jamais à Docker** : si une base est arrêtée, il te demande de la lever.
- Il ne retire jamais un bump pour faire passer les tests : un commit rouge est une information.
- Il ne voit pas ce qui est hors pnpm (Python, Go…), et il le dit dans la PR.

## Crédit

Plusieurs mécanismes viennent du [security-audit-skill de Cloudflare](https://github.com/cloudflare/security-audit-skill) (MIT), adaptés aux dépendances : la mémoire de la campagne précédente, la liste d'unités posée avant le dispatch (d'où la section « Non couvert »), la réfutation par un agent neuf, et le retour JSON imposé, qui empêche une hypothèse de porter un verdict. Seules les idées sont reprises : aucun texte n'est copié.

## Tests

Depuis la racine de ce dépôt : `pnpm install && pnpm test`.
