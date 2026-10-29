import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Tout ce qui est propre au projet cible vit dans ce fichier, à sa racine : le périmètre,
 * les commandes de l'oracle, les préalables, les groupes couplés, la PR. Le moteur n'en
 * contient aucune valeur en dur.
 */
export const NOM_CONFIG = 'deps-campagne.config.json'

const DEFAUTS = {
  prealables: [],
  groupesCouples: [],
  cheminsCommit: ['package.json', 'pnpm-lock.yaml', 'apps', 'packages'],
  pr: { base: 'main', titre: 'chore(deps): campagne du' },
  fichierDependances: 'DEPENDENCIES.md',
}

const TSC_PAR_DEFAUT = ['tsc', '--noEmit']

const estObjet = (v) => typeof v === 'object' && v !== null && !Array.isArray(v)
const estTexte = (v) => typeof v === 'string' && v.length > 0
// Une commande est un argv, jamais une chaîne : le moteur ne passe jamais par un shell.
const estArgv = (v) => Array.isArray(v) && v.length > 0 && v.every(estTexte)

/**
 * Valide à la main, sans bibliothèque : le moteur n'a pas d'autre dépendance que semver.
 * Rend la liste des erreurs, chacune préfixée par le chemin de la clé fautive. Vide = valide.
 */
export function validerConfig(objet) {
  const erreurs = []
  if (!estObjet(objet)) return ['la config doit être un objet JSON']

  if (!Array.isArray(objet.workspaces) || objet.workspaces.length === 0) {
    erreurs.push('workspaces : obligatoire, une liste non vide de { paquet }')
  } else {
    objet.workspaces.forEach((ws, i) => erreurs.push(...validerWorkspace(ws, `workspaces[${i}]`)))
  }

  if (objet.prealables !== undefined) {
    if (!Array.isArray(objet.prealables)) erreurs.push('prealables : doit être une liste')
    else
      objet.prealables.forEach((p, i) => erreurs.push(...validerPrealable(p, `prealables[${i}]`)))
  }

  if (objet.groupesCouples !== undefined) {
    if (!Array.isArray(objet.groupesCouples)) erreurs.push('groupesCouples : doit être une liste')
    else
      objet.groupesCouples.forEach((g, i) =>
        erreurs.push(...validerGroupe(g, `groupesCouples[${i}]`)),
      )
  }

  if (objet.cheminsCommit !== undefined && !estArgv(objet.cheminsCommit)) {
    erreurs.push('cheminsCommit : doit être une liste non vide de chemins')
  }

  if (objet.pr !== undefined) {
    if (!estObjet(objet.pr)) erreurs.push('pr : doit être un objet { base, titre }')
    else {
      if (objet.pr.base !== undefined && !estTexte(objet.pr.base))
        erreurs.push('pr.base : doit être un nom de branche')
      if (objet.pr.titre !== undefined && !estTexte(objet.pr.titre))
        erreurs.push('pr.titre : doit être un texte')
    }
  }

  if (objet.fichierDependances !== undefined && !estTexte(objet.fichierDependances)) {
    erreurs.push('fichierDependances : doit être un chemin')
  }

  return erreurs
}

function validerWorkspace(ws, chemin) {
  if (!estObjet(ws))
    return [`${chemin} : doit être un objet { paquet, typage?, lint?, test?, env? }`]
  const erreurs = []
  if (!estTexte(ws.paquet)) erreurs.push(`${chemin}.paquet : obligatoire, le nom du paquet`)

  if (ws.typage !== undefined) {
    if (!estObjet(ws.typage))
      erreurs.push(`${chemin}.typage : doit être un objet { prepare?, purger?, commande? }`)
    else {
      if (ws.typage.prepare !== undefined && !estArgv(ws.typage.prepare)) {
        erreurs.push(
          `${chemin}.typage.prepare : doit être un argv, par exemple ["prisma", "generate"]`,
        )
      }
      if (ws.typage.purger !== undefined && !estTexte(ws.typage.purger)) {
        erreurs.push(
          `${chemin}.typage.purger : doit être un chemin, par exemple "tsconfig.tsbuildinfo"`,
        )
      }
      if (ws.typage.commande !== undefined && !estArgv(ws.typage.commande)) {
        erreurs.push(
          `${chemin}.typage.commande : doit être un argv, par exemple ["tsc", "--noEmit"]`,
        )
      }
    }
  }

  for (const cle of ['lint', 'test']) {
    if (ws[cle] !== undefined && !estArgv(ws[cle])) {
      erreurs.push(
        `${chemin}.${cle} : doit être un argv, par exemple ["pnpm", "-F", "${ws.paquet ?? '<paquet>'}", "run", "${cle}"]`,
      )
    }
  }

  if (ws.env !== undefined) {
    if (!estObjet(ws.env) || !Object.values(ws.env).every((v) => typeof v === 'string')) {
      erreurs.push(`${chemin}.env : doit être un objet de chaînes`)
    }
  }
  return erreurs
}

function validerPrealable(p, chemin) {
  if (!estObjet(p)) return [`${chemin} : doit être un objet { nom, hote, port, pourquoi }`]
  const erreurs = []
  for (const cle of ['nom', 'hote', 'pourquoi']) {
    if (!estTexte(p[cle])) erreurs.push(`${chemin}.${cle} : obligatoire, un texte`)
  }
  if (!Number.isInteger(p.port) || p.port < 1 || p.port > 65535) {
    erreurs.push(`${chemin}.port : obligatoire, un entier entre 1 et 65535 (pas une chaîne)`)
  }
  return erreurs
}

function validerGroupe(g, chemin) {
  if (!estObjet(g)) return [`${chemin} : doit être un objet { nom, prefixe? , paquets? }`]
  const erreurs = []
  if (!estTexte(g.nom)) erreurs.push(`${chemin}.nom : obligatoire, un texte`)
  if (g.prefixe !== undefined && !estTexte(g.prefixe))
    erreurs.push(`${chemin}.prefixe : doit être un texte`)
  if (g.paquets !== undefined && !estArgv(g.paquets))
    erreurs.push(`${chemin}.paquets : doit être une liste de noms`)
  if (g.prefixe === undefined && g.paquets === undefined) {
    erreurs.push(`${chemin} : il faut un prefixe ou une liste de paquets`)
  }
  return erreurs
}

/**
 * Lit, valide et complète la config. Lève une Error au message actionnable, toujours
 * préfixé par le nom du fichier : run.mjs l'affiche telle quelle, sans stack trace.
 */
export function chargerConfig(racine) {
  const fichier = join(racine, NOM_CONFIG)
  if (!existsSync(fichier)) {
    throw new Error(
      `${NOM_CONFIG} : introuvable dans ${racine}. Copie deps-campagne.config.example.json depuis le dossier du skill, puis remplis-le.`,
    )
  }

  let objet
  try {
    objet = JSON.parse(readFileSync(fichier, 'utf8'))
  } catch (erreur) {
    throw new Error(`${NOM_CONFIG} : JSON illisible (${erreur.message}).`)
  }

  const erreurs = validerConfig(objet)
  if (erreurs.length > 0) {
    throw new Error(`${NOM_CONFIG} : config invalide.\n${erreurs.map((e) => `- ${e}`).join('\n')}`)
  }

  // `git add` et le `git checkout` du banc d'essai échouent en bloc sur un seul chemin
  // inconnu : rien ne serait indexé, ni restauré. Les défauts ne gardent donc que ce qui
  // existe, et un chemin déclaré absent est une erreur de config.
  const cheminsCommit =
    objet.cheminsCommit ??
    DEFAUTS.cheminsCommit.filter((chemin) => existsSync(join(racine, chemin)))
  const absents = cheminsCommit.filter((chemin) => !existsSync(join(racine, chemin)))
  if (absents.length > 0) {
    throw new Error(
      `${NOM_CONFIG} : cheminsCommit désigne des chemins introuvables dans ${racine} : ${absents.join(', ')}. Retire-les, ou corrige-les.`,
    )
  }

  return {
    ...DEFAUTS,
    ...objet,
    cheminsCommit,
    pr: { ...DEFAUTS.pr, ...objet.pr },
    workspaces: objet.workspaces.map((ws) =>
      ws.typage ? { ...ws, typage: { commande: TSC_PAR_DEFAUT, ...ws.typage } } : ws,
    ),
  }
}
