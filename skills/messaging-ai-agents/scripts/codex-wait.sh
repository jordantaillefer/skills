#!/usr/bin/env bash
# Attend que Codex ait traité le message mis en file par codex-send.sh, puis
# affiche sa réponse finale. Sort en 0 avec la réponse, en 2 au délai dépassé.
# Usage : codex-wait.sh <historique.jsonl> <ligne de départ> [délai en secondes, 1800 par défaut]
set -euo pipefail

rollout="${1:?historique .jsonl de la session}"
offset="${2:?ligne de départ donnée par codex-send.sh}"
timeout_seconds="${3:-1800}"

# Les événements écrits depuis l'envoi. La dernière ligne peut être en cours
# d'écriture : `fromjson?` ignore ce qui n'est pas encore du JSON complet.
events_since_send() {
  tail -n +"$((offset + 1))" "$rollout" | jq -Rc 'fromjson? | select(.type == "event_msg") | .payload'
}

deadline=$(( $(date +%s) + timeout_seconds ))
turn_id=""
while (( $(date +%s) < deadline )); do
  events="$(events_since_send)"
  # Notre message ouvre le premier tour déclenché par la file après l'envoi ;
  # un tour lancé à la main dans le terminal a un autre déclencheur.
  if [[ -z "$turn_id" ]]; then
    turn_id="$(jq -r 'select(.type == "task_started" and .turn_attribution.turn_trigger == "queue")
                      | .turn_attribution.turn_id' <<<"$events" | head -1)"
  fi
  if [[ -n "$turn_id" ]]; then
    answer="$(jq -r --arg turn "$turn_id" 'select(.type == "task_complete" and .turn_id == $turn)
                                            | .last_agent_message // "(tour terminé sans message)"' <<<"$events")"
    if [[ -n "$answer" ]]; then
      echo "Codex a terminé :"
      echo "$answer"
      exit 0
    fi
  fi
  sleep 2
done

if [[ -z "$turn_id" ]]; then
  echo "Délai dépassé : Codex n'a pas pris le message (session fermée, ou occupée par un long tour)."
else
  echo "Délai dépassé : Codex travaille encore sur le message (tour $turn_id), ou attend une approbation dans son terminal."
fi
exit 2
