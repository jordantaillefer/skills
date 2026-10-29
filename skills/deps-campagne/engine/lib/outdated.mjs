import semver from 'semver'

/**
 * Transforme la sortie de `pnpm outdated --format json` en liste plate.
 * Ne JAMAIS lire `info.wanted` : il rapporte `current` même quand le range autorise mieux.
 */
export function parseOutdated(raw) {
  return Object.entries(raw)
    .map(([name, info]) => {
      const current = semver.coerce(info.current)
      const latest = semver.coerce(info.latest)
      if (!current || !latest) return null
      return {
        name,
        current: info.current,
        latest: info.latest,
        isMajor: semver.major(latest) !== semver.major(current),
        // Indispensable : `pnpm add` écrit dans `dependencies` par défaut. Sans savoir
        // qu'un paquet est une devDependency, on le déplacerait silencieusement de section.
        estDevDependency: info.dependencyType === 'devDependencies',
        dependents: (info.dependentPackages ?? []).map((p) => p.name),
      }
    })
    .filter((dep) => dep !== null)
}

/**
 * Interprète le résultat brut de `pnpm outdated --format json`, et LÈVE plutôt que de
 * rendre une liste vide quand quelque chose s'est mal passé.
 *
 * Comportement mesuré de pnpm :
 * - deps périmées      -> exit 1 + JSON        (cas nominal : 1 n'est PAS une erreur)
 * - filtre invalide    -> exit 0 + texte brut  ("No projects matched the filters...")
 * - rien de périmé     -> exit 0 + vide/{}
 *
 * Le trou à ne pas laisser : stdout vide avec un code non nul (pnpm plante et écrit sur
 * stderr) serait lu comme « rien de périmé », et la campagne produirait une branche vide
 * en se croyant à jour. C'est exactement le no-op silencieux qu'on reproche à Dependabot.
 */
export function interpreterOutdated({ code, stdout, stderr }) {
  const texte = (stdout ?? '').trim()

  if (!texte) {
    if (code === 0) return []
    throw new Error(
      `pnpm outdated a échoué (code ${code}) sans rien produire : ${(stderr ?? '').trim() || '(aucune sortie)'}`,
    )
  }

  let brut
  try {
    brut = JSON.parse(texte)
  } catch {
    throw new Error(`pnpm outdated n'a pas rendu du JSON : ${texte.slice(0, 200)}`)
  }

  return parseOutdated(brut)
}

/**
 * Regroupe les paquets qui doivent bouger d'un seul tenant (`groupesCouples` de la config) ;
 * les autres forment un groupe d'un seul élément.
 *
 * Deux exemples de couplage qui justifient un groupe :
 * - une famille de paquets frères (`@tiptap/*`) : des versions désalignées chargent plusieurs
 *   instances du cœur au runtime, et l'éditeur casse ;
 * - un outil qui encode la version d'un autre dans la sienne (le numéro d'`oxlint-tsgolint`
 *   encode celle de TypeScript qu'il cible) : monter l'un sans l'autre fait juger le lint par
 *   un compilateur différent de celui qui compile.
 *
 * Un paquet appartient à un groupe si son nom commence par `prefixe` ou figure dans `paquets`.
 */
export function grouperCouples(deps, groupesCouples = []) {
  const groupes = new Map()
  const concerne = (groupe, name) =>
    (groupe.prefixe !== undefined && name.startsWith(groupe.prefixe)) ||
    (groupe.paquets ?? []).includes(name)

  for (const dep of deps) {
    const couple = groupesCouples.find((g) => concerne(g, dep.name))
    const nom = couple ? couple.nom : dep.name
    if (!groupes.has(nom)) groupes.set(nom, { nom, deps: [] })
    groupes.get(nom).deps.push(dep)
  }

  return [...groupes.values()]
}
