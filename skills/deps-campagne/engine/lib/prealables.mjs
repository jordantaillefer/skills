import { createConnection } from 'node:net'

/**
 * Le service répond-il ? Une simple connexion TCP : le moteur constate, il ne démarre rien.
 * Ne lève jamais — un refus, un hôte inconnu ou un délai dépassé rendent tous `false`.
 */
export function joignable({ hote, port }, delaiMs = 2000) {
  return new Promise((resoudre) => {
    const socket = createConnection({ host: hote, port })
    const conclure = (ok) => {
      socket.destroy()
      resoudre(ok)
    }
    socket.setTimeout(delaiMs, () => conclure(false))
    socket.once('connect', () => conclure(true))
    socket.once('error', () => conclure(false))
  })
}

/**
 * Un message par préalable injoignable, vide si tout répond.
 *
 * Sans ce contrôle, une base arrêtée rendrait chaque commit de la campagne rouge pour une
 * raison qui n'a rien à voir avec les dépendances — et le rapport l'attribuerait aux bumps.
 */
export async function verifierPrealables(prealables, sonde = joignable) {
  const messages = []
  for (const { nom, hote, port, pourquoi } of prealables) {
    if (!(await sonde({ hote, port }))) {
      messages.push(
        `${nom} injoignable (${hote}:${port}) — ${pourquoi}. Lève-le, puis relance. Le moteur ne touche jamais aux conteneurs.`,
      )
    }
  }
  return messages
}
