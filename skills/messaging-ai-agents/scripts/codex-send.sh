#!/usr/bin/env bash
# Met un message en file pour une session Codex existante, désignée par son nom
# exact ou son id, puis affiche la commande qui attend sa réponse.
# Usage : codex-send.sh <nom-ou-id> <message>
set -euo pipefail

target="${1:?nom ou id de la session Codex}"
message="${2:?message à transmettre}"
codex_home="${CODEX_HOME:-$HOME/.codex}"
script_dir="$(cd "$(dirname "$0")" && pwd)"

# Résoudre le nom en id : on refuse d'envoyer si le nom ne désigne pas exactement une session.
if [[ "$target" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
  id="$target"
else
  ids="$(bash "$script_dir/codex-sessions.sh" | awk -F'\t' -v name="$target" '$1==name{print $2}')"
  count="$(grep -c . <<<"$ids" || true)"
  if [[ "$count" -eq 0 ]]; then
    echo "Aucune session Codex nommée « $target ». Sessions connues :" >&2
    bash "$script_dir/codex-sessions.sh" >&2 || true
    exit 1
  elif [[ "$count" -gt 1 ]]; then
    echo "Plusieurs sessions Codex s'appellent « $target » : désigner par id." >&2
    bash "$script_dir/codex-sessions.sh" | awk -F'\t' -v name="$target" '$1==name' >&2
    exit 1
  fi
  id="$ids"
fi

rollout="$(find "$codex_home/sessions" -name "rollout-*-$id.jsonl" 2>/dev/null | head -1)"
if [[ -z "$rollout" ]]; then
  echo "Historique introuvable pour la session $id : impossible d'attendre sa réponse." >&2
  exit 1
fi

# Tout ce qui est écrit après cette ligne vient après notre envoi.
offset="$(wc -l <"$rollout" | tr -d ' ')"

codex queue --thread "$id" --message "$message"

echo "Pour attendre la réponse (Bash en arrière-plan) :"
echo "bash $script_dir/codex-wait.sh $rollout $offset"
