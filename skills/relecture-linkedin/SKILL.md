---
name: relecture-linkedin
description: À utiliser quand un brouillon de post LinkedIn dans Gecko Social doit être challengé avant publication — « relis ce post », « challenge ce brouillon », « est-ce que ce post est bon », /relecture-linkedin, ou depuis un autre skill juste avant de demander la validation d'un post.
argument-hint: [postId] [commentaire:<texte ou chemin>] [fichiers de règles ou d'historique…]
---

# Relecture stricte d'un post LinkedIn

Tu fais relire un brouillon Gecko par un éditeur intraitable, puis tu tiens la boucle jusqu'à ce que le post soit le meilleur possible. Tu ne rassures pas : un post creux ne part pas.

**Prérequis :** les outils du MCP Gecko Social (`get_post`, `get_drafts`, `get_posts`, `update_post_text`, et pour un post déjà programmé `cancel_scheduled_post` et `schedule_post`). S'ils sont absents, dis-le et arrête-toi.

## Ce que tu ne fais jamais

- `create_post`, `schedule_comment` : jamais.
- `schedule_post` : seulement pour reprogrammer, à son `scheduledAt` d'origine, un post que tu as dû annuler pour le modifier (étape 1).
- `update_post_text` : seulement pour une réécriture que l'utilisateur a acceptée explicitement.

## 1. Le brouillon

- Avec un `postId` : `get_post`.
- Sans : `get_drafts`, garde les brouillons qui visent un compte LinkedIn, prends le plus récemment modifié (`updatedAt`) et nomme-le à l'utilisateur avant de continuer. Aucun brouillon : dis-le et arrête-toi.
- Post `SCHEDULED` : relis-le quand même. Pour le modifier, sur accord : `cancel_scheduled_post`, `update_post_text`, puis `schedule_post` au même `scheduledAt`. Si cette date est passée ou à moins d'une heure, demande une nouvelle date à l'utilisateur. Vérifie ensuite avec `get_post` que le commentaire programmé est toujours là ; sinon, dis-le.
- Le commentaire prévu : celui de `get_post`, sinon celui que donne l'argument `commentaire:` (un texte, ou le chemin d'un JSON qui a un champ `commentaire`).
- Une image : télécharge-la (`curl -s -o <scratchpad>/visuel.jpg <url>`) et donne son chemin au relecteur.

Tout cela forme `{{POST}}` : texte intégral tel que `get_post` le rend, type de média et chemin de l'image, commentaire prévu.

## 2. Le contexte

- **Historique** (`{{HISTORIQUE}}`) : `get_posts` vues `top_impressions`, `top_comments` et `recently_published` ; ne garde que les posts publiés depuis moins de 18 mois (au-delà, Gecko fait varier fortement les impressions). Classe-les par impressions et lis le texte (`get_post`) des 3 plus vus et des 3 moins vus. Donne titre, date, impressions, commentaires et texte, sans étiqueter toi-même le format.
- **Règles** (`{{REGLES}}`) : les fichiers de règles passés en argument, lus en entier. Sans fichier : « Aucune règle fournie. »
- **Contexte** (`{{CONTEXTE}}`) : les fichiers d'historique passés en argument (posts publiés…). Sans fichier : « Aucun. »
- **Tournures** (`{{TOURNURES}}`) : `tournures-bannies.md`, à côté de ce fichier.

Un fichier passé en argument est une règle s'il dit comment écrire, un contexte s'il raconte ce qui a été publié.

## 3. La relecture

Remplis `brief-relecteur.md` (à côté de ce fichier) et donne tout ce qui suit son `---` à un **sous-agent neuf** : Agent, `subagent_type: general-purpose`, `model: opus`. Jamais toi-même : si tu as écrit ou corrigé le post dans cette conversation, tu seras indulgent.

Vérifie le JSON rendu contre le contrat du brief : verdict cohérent avec les `bloquant` ; citations présentes mot pour mot dans le texte de `get_post` ; chiffres présents dans l'historique Gecko. Un écart : relance un sous-agent neuf en le signalant.

## 4. La présentation

Dans cet ordre, sans adoucir ni ajouter de compliment :
1. le verdict et le `resume` ;
2. la comparaison à l'historique (titres et impressions réels, `presage`) ;
3. **tous les bloquants**, quelle que soit leur section : accroche (problème → réécriture), pertinence (ce qui manque, redite), phrases (citation → pourquoi → réécriture), objections sans parade (objection → parade), règles (règle → écart) ;
4. les améliorations, au même format.

Termine par une seule question : quelles réécritures appliquer.

## 5. La boucle

1. Applique dans Gecko uniquement ce que l'utilisateur accepte. Quand il dicte une correction, prends le sens, pas les mots : reformule dans un registre propre.
2. Le texte a changé : relis le brouillon **depuis Gecko** (`get_post`), jamais depuis ta mémoire, et relance l'étape 3 avec un nouveau sous-agent neuf.
3. L'utilisateur conteste un point sans rien changer : ne relance pas. Note sa décision ; un bloquant contesté se rappelle une fois, nommément, puis la décision lui appartient.
4. Arrête quand le verdict est `publiable`, ou quand l'utilisateur passe outre.

## 6. Les tournures à ajouter

Si le relecteur rend des `tournures_a_ajouter`, propose-les. Sur accord :
- si `git -C <dossier de ce skill> remote get-url origin` désigne `jordantaillefer/skills` : ajoute les lignes au format du fichier, lance `pnpm test` et `pnpm fuites` à la racine du dépôt, commite ce seul fichier sur la branche courante, et propose de pousser ;
- sinon : donne les lignes à ajouter et suggère d'ouvrir une issue sur https://github.com/jordantaillefer/skills.

## Erreurs courantes

| Tentation | Réalité |
|---|---|
| « Le post est presque bon, je mets publiable » | Un bloquant restant interdit `publiable`. |
| « Ce format fera environ 2 000 impressions » | Aucune prévision chiffrée : dire à quoi il ressemble et comment ceux-là ont marché. |
| « Je relis moi-même, c'est plus rapide » | Sous-agent neuf, à chaque tour où le texte change. |
| « C'est mieux maintenant » | Pas sans une relecture depuis Gecko. |
| Recopier la consigne orale de l'utilisateur dans le post | Ses mots donnent le sens ; la phrase publiée est réécrite proprement. |
