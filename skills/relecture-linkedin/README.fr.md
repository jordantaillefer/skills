# relecture-linkedin

[English](README.md) · **Français**

Un éditeur intraitable pour tes brouillons LinkedIn dans Gecko Social. Il lit un brouillon, le démonte à la lumière de l'historique de tes posts, et continue jusqu'à ce que le post soit le meilleur possible, ou jusqu'à ce que tu décides qu'il ne vaut pas la peine d'être publié.

## Ce qu'il fait

- Il lit le brouillon (texte, image, commentaire prévu) et tes posts des 18 derniers mois, avec leurs impressions.
- Il confie le tout à un **sous-agent neuf**, qui n'a pas vu la conversation où le post a été écrit : il n'a aucune raison d'être indulgent.
- Le relecteur rend un JSON imposé : un verdict (`publiable`, `à retravailler`, `à jeter`), les posts passés auxquels celui-ci ressemble et ce qu'ils ont fait, ce que le lecteur apprend vraiment, l'accroche, **chaque phrase faible citée mot pour mot** avec sa catégorie et une réécriture, les objections qu'un expert postera en commentaire, et les écarts à tes propres règles.
- `publiable` est impossible tant qu'il reste un point bloquant. Aucune prévision d'impressions n'est inventée : seulement les vrais chiffres de ton historique.
- Tu choisis les réécritures ; il applique seulement celles-là au brouillon Gecko, relit le brouillon depuis Gecko et relance un nouveau relecteur neuf. Et ainsi de suite, jusqu'au verdict `publiable` ou jusqu'à ce que tu tranches.
- Il est livré avec une liste de tournures creuses (`tournures-bannies.md`) qui s'enrichit au fil des relectures.

## Quand l'utiliser

Avant de programmer n'importe quel post. Ou depuis ton propre skill de publication, juste avant de demander la validation.

## Installation et lancement

```bash
npx skills add jordantaillefer/skills --skill relecture-linkedin
```

Il faut le **MCP Gecko Social** connecté dans Claude Code.

Puis : `/relecture-linkedin` (dernier brouillon), `/relecture-linkedin <postId>`, ou `/relecture-linkedin <postId> chemin/regles-de-style.md chemin/posts-publies.md` pour faire vérifier aussi tes propres règles.

## Ce qu'il ne fait pas

- Il ne crée, ne programme et ne publie jamais de post, et n'ajoute jamais de commentaire.
- Il ne modifie jamais le brouillon sans ton « oui » explicite sur chaque réécriture.
- Il n'écrit pas de post de zéro.
