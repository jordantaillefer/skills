# Dépendances

Ce fichier dit **pourquoi** une dépendance s'écarte de la règle : un override, un pin exact, une
exclusion de quarantaine, une dépendance hors registre. `deps-campagne` le lit à chaque campagne
et le met à jour. Les lignes ci-dessous sont des exemples fictifs : remplace-les par les tiennes.

## Règles

1. Toute exception a sa ligne ici, avec sa raison.
2. Toute exception a une **condition de sortie** : le fait qui permettra de la retirer. Sans elle,
   aucune campagne ne pourra jamais dire qu'elle est devenue inutile.

## Overrides

Les `pnpm.overrides` du `package.json` racine. Un **plancher** (`>=X`) corrige presque toujours
une vulnérabilité ; un **plafond** (`<X`) dit qu'une version casse quelque chose.

| Paquet | Plancher ou plafond | Raison | Condition de sortie |
|---|---|---|---|
| `exemple-id@>=3.0.0 <3.1.1` | plancher `>=3.1.1` | advisory sur les versions antérieures, tirées par une dépendance transitive | le parent qui tire exemple-id 3.0.x passe en 3.1.1 ou plus |

## Pins exacts

| Paquet | Version | Raison | Condition de sortie |
|---|---|---|---|
| `exemple-lib` | `2.3.1` | la 2.4.0 change le format de sortie par défaut | migration du format faite dans `@exemple/api` |

## Exclusions de quarantaine

Les entrées de `minimumReleaseAgeExclude` dans `pnpm-workspace.yaml`. Chacune porte, juste
au-dessus d'elle, son marqueur `# expire: <AAAA-MM-JJ|jamais>` : sans lui, `pnpm deps:quarantaine`
ne peut pas la vérifier.

| Paquet | Échéance | Raison |
|---|---|---|
| `exemple-framework` | jamais | politique : les correctifs de sécurité doivent passer sans délai |

## Dépendances hors registre

Les dépendances déclarées par URL de tarball, `git+…`, `github:…` ou `file:`. Elles échappent à
`pnpm outdated`, à `pnpm audit` et à la quarantaine. **Le moteur refuse de démarrer** tant que
l'une d'elles n'a pas sa ligne dans ce tableau, le nom du paquet entre backticks en première
colonne. Garde cet intitulé de section tel quel : le moteur le cherche.

| Paquet | Specifier | Raison | Condition de sortie | Revue |
|---|---|---|---|---|
| `exemple-tableur` (`@exemple/web`) | `file:./vendor/exemple-tableur-1.0.0.tgz` | correctif local, en attendant une version publiée | publication du correctif sur le registre npm | à chaque campagne |

## Packages à surveiller

Ce qu'on ne bumpe pas encore, et ce qui lèvera le blocage.

| Paquet | Pourquoi on attend | Ce qui lève le blocage |
|---|---|---|
| `exemple-orm` | le major suivant exige Node 26 | le projet passe en Node 26 |
