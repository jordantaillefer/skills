#!/usr/bin/env bash
# Liste les sessions Codex nommées, la plus récemment active d'abord :
# « nom<TAB>id<TAB>répertoire<TAB>dernière activité ».
# Un filtre optionnel ne garde que les noms ou répertoires qui le contiennent.
# Lecture seule.
set -euo pipefail

filter="${1:-}"
codex_home="${CODEX_HOME:-$HOME/.codex}"
index="$codex_home/session_index.jsonl"

if [[ ! -f "$index" ]]; then
  echo "Aucun index de sessions Codex ($index)." >&2
  exit 1
fi

# Une session renommée apparaît plusieurs fois dans l'index : la dernière ligne gagne.
jq -rs 'map(select(.thread_name != null and .thread_name != ""))
        | group_by(.id) | map(max_by(.updated_at))
        | sort_by(.updated_at) | reverse
        | .[] | [.thread_name, .id, .updated_at] | @tsv' "$index" |
while IFS=$'\t' read -r name id updated_at; do
  rollout="$(find "$codex_home/sessions" -name "rollout-*-$id.jsonl" 2>/dev/null | head -1)"
  cwd="?"
  [[ -n "$rollout" ]] && cwd="$(head -1 "$rollout" | jq -r '.payload.cwd // "?"' 2>/dev/null || echo "?")"
  if [[ -z "$filter" || "$name" == *"$filter"* || "$cwd" == *"$filter"* ]]; then
    printf '%s\t%s\t%s\t%s\n' "$name" "$id" "$cwd" "$updated_at"
  fi
done
