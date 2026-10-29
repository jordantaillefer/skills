#!/usr/bin/env bash
# Cherche toute trace d'un contexte client ou personnel qui ne doit pas finir dans le dépôt
# public : dans les fichiers suivis ou à suivre par git, puis dans tout l'historique.
# Sort en 1 s'il en trouve.
#
# Les motifs vivent dans `.fuites-motifs` (une expression régulière étendue par ligne), ignoré
# par git : la liste de ce qu'on cache ne doit pas être publiée elle-même.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

if [ ! -s .fuites-motifs ]; then
  echo "Il manque .fuites-motifs (une expression régulière par ligne, jamais commité)."
  exit 2
fi
motifs=$(grep -v '^\s*$' .fuites-motifs | paste -sd '|' -)

trouve=$(git ls-files -co --exclude-standard -z | xargs -0 grep -nIE "$motifs" -- 2>/dev/null || true)
historique=""
if git rev-parse -q --verify HEAD >/dev/null; then
  historique=$(git log -p --all --format='commit %h %an <%ae> %s' | grep -nIE "$motifs" || true)
fi

if [ -n "$trouve$historique" ]; then
  echo "Fuites détectées :"
  [ -n "$trouve" ] && echo "$trouve"
  [ -n "$historique" ] && echo "-- dans l'historique git :" && echo "$historique"
  exit 1
fi
echo "Aucune fuite."
