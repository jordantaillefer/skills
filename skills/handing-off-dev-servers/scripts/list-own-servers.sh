#!/usr/bin/env bash
# Liste les processus lancés depuis CE lieu de travail (dépôt ou worktree git) :
# ceux dont le répertoire courant est dedans, orphelins compris, en excluant les
# worktrees imbriqués, l'outillage Claude et le shell qui exécute ce script.
# Lecture seule : n'arrête rien.
set -euo pipefail

start_dir="${1:-$PWD}"
root="$(git -C "$start_dir" rev-parse --show-toplevel 2>/dev/null || (cd "$start_dir" && pwd -P))"

# Les autres worktrees imbriqués sous ce root (ex. .claude/worktrees/*) ne sont pas à nous.
nested_worktrees=()
while IFS= read -r line; do
  path="${line#worktree }"
  [[ "$path" != "$root" && "$path" == "$root"/* ]] && nested_worktrees+=("$path")
done < <(git -C "$root" worktree list --porcelain 2>/dev/null | grep '^worktree ' || true)

# Le shell courant et ses ancêtres : ne jamais se lister soi-même.
self_chain=" "
pid=$$
while [[ -n "$pid" && "$pid" != "0" && "$pid" != "1" ]]; do
  self_chain+="$pid "
  pid="$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ' || true)"
done

# Notre propre groupe de processus : les autres membres d'un tube (`… | cut`) en font
# partie. Des serveurs lancés en arrière-plan depuis le même terminal ont, eux, leur
# propre groupe (contrôle des tâches) et restent listés.
own_group="$(ps -o pgid= -p $$ | tr -d ' ')"

# Ports en écoute, une ligne « pid port » chacun (bash 3.2 de macOS : pas de tableau associatif).
listeners="$(lsof -nP -iTCP -sTCP:LISTEN -Fpn 2>/dev/null |
  awk '/^p/{pid=substr($0,2)} /^n/{sub(/.*:/,""); print pid, $0}' || true)"
ports_of() {
  awk -v pid="$1" '$1==pid{printf "%s ", $2}' <<<"$listeners"
}

# 1. Les processus du lieu, une ligne « pid<TAB>ppid<TAB>command ».
candidates=""
current=""
while IFS= read -r field; do
  case "$field" in
    p*) current="${field#p}" ;;
    n*)
      cwd="${field#n}"
      [[ "$cwd" == "$root" || "$cwd" == "$root"/* ]] || continue
      for nested in "${nested_worktrees[@]:-}"; do
        [[ -n "$nested" && ( "$cwd" == "$nested" || "$cwd" == "$nested"/* ) ]] && continue 2
      done
      [[ "$self_chain" == *" $current "* ]] && continue
      [[ "$(ps -o pgid= -p "$current" 2>/dev/null | tr -d ' ')" == "$own_group" ]] && continue
      command="$(ps -o command= -p "$current" 2>/dev/null || true)"
      [[ -z "$command" ]] && continue
      # Outillage et postes de travail, jamais des serveurs de l'app.
      [[ "$command" =~ (^|/)claude( |$)|mcp|caffeinate|^/Applications/ ]] && continue
      [[ "$command" =~ ^-[a-z]*sh$|sh\ -[a-z]*l[a-z]*$ ]] && continue # terminaux interactifs
      parent="$(ps -o ppid= -p "$current" | tr -d ' ')"
      candidates+="$current"$'\t'"$parent"$'\t'"$command"$'\n'
      ;;
  esac
done < <(lsof -d cwd -Fpn 2>/dev/null || true)

is_candidate() { awk -F'\t' -v pid="$1" '$1==pid{found=1} END{exit !found}' <<<"$candidates"; }
parent_of() { awk -F'\t' -v pid="$1" '$1==pid{print $2}' <<<"$candidates"; }

# 2. Les serveurs : chaque processus en écoute, et ses lanceurs dans le lieu.
server_pids=" "
while IFS=$'\t' read -r pid _ _; do
  [[ -z "$pid" || -z "$(ports_of "$pid")" ]] && continue
  walker="$pid"
  while [[ -n "$walker" ]] && is_candidate "$walker"; do
    server_pids+="$walker "
    walker="$(parent_of "$walker")"
  done
done <<<"$candidates"

print_rows() {
  local wanted="$1"
  printf '%-7s %-7s %-12s %s\n' PID PPID PORTS COMMAND
  while IFS=$'\t' read -r pid parent command; do
    [[ -z "$pid" ]] && continue
    local in_servers=no
    [[ "$server_pids" == *" $pid "* ]] && in_servers=yes
    [[ "$in_servers" == "$wanted" ]] || continue
    # Hors serveurs : un shell d'outil Claude dont le parent est une session vivante est
    # un appel en cours (le nôtre ou celui d'une session voisine), pas un processus à juger.
    if [[ "$in_servers" == no && "$command" == *".claude/shell-snapshots/"* ]] &&
      ps -o command= -p "$parent" 2>/dev/null | grep -Eq '(^|/)claude( |$)'; then
      continue
    fi
    local ports; ports="$(ports_of "$pid")"
    printf '%-7s %-7s %-12s %s\n' "$pid" "$parent" "${ports:--}" "${command:0:110}"
  done <<<"$candidates"
}

echo "Lieu de travail : $root"
echo
echo "== Serveurs (en écoute, avec leurs lanceurs) : à couper en bloc"
print_rows yes
echo
echo "== Autres processus lancés d'ici : à juger un par un (PPID 1 = orphelin)"
print_rows no
