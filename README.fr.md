# skills

[English](README.md) · **Français**

Des skills Claude Code que j'utilise au quotidien en mission. Ce ne sont pas des démos : chacun existe parce que j'en avais assez de faire quelque chose à la main.

| Skill | Ce qu'il fait |
|---|---|
| [`deps-campagne`](skills/deps-campagne) | Une campagne d'upgrade des dépendances qui remplace Dependabot : un commit par bump, un oracle après chacun, un agent par major, les hypothèses séparées de ce qui est prouvé, et une seule PR à lire. Monorepo pnpm + TypeScript. |
| [`daily`](skills/daily) | Le bilan de tes commits et de tes PR sur une période, regroupés par thème, pour le daily standup. |
| [`monthly`](skills/monthly) | Un mois de travail réécrit en fonctionnalités et en impacts métier, prêt pour une slide de reporting. |
| [`handing-off-dev-servers`](skills/handing-off-dev-servers) | Passe la main des serveurs de dev d'une session Claude Code à une autre, sur les mêmes ports, sans couper ceux des autres. macOS. |

## Installation

```bash
npx skills add jordantaillefer/skills --skill <nom>
```

Le README de chaque skill dit ce qu'il lui faut (`deps-campagne` demande quelques étapes de plus).

## Langue

Les `SKILL.md` sont en français, la langue dans laquelle je travaille. Claude Code les suit sans problème et te répond dans ta langue. Chaque README existe en anglais et en français.

## Licence

[MIT](LICENSE) © 2026 Jordan Taillefer
