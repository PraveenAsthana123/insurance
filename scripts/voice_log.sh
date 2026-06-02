#!/usr/bin/env bash
# voice_log — query voice command history from SQLite.
#
# Per operator 2026-06-01 ("save these commands on sqlite as well").
#
# Usage:
#   bash scripts/voice_log                # show last 20
#   bash scripts/voice_log --all          # everything
#   bash scripts/voice_log --search "..."  # text-search transcripts
#   bash scripts/voice_log --triggers     # trigger-word frequency
#   bash scripts/voice_log --schema       # show table layout

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB="$REPO/data/voice_history.db"

if [[ ! -f "$DB" ]]; then
    /media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python "$REPO/scripts/voice_history_init.py"
fi

CMD="${1:-recent}"

case "$CMD" in
    --all)
        sqlite3 -column -header "$DB" "
            SELECT ts, substr(raw_transcript,1,60) AS text, trigger_word, action
            FROM voice_history ORDER BY ts DESC;"
        ;;
    --search)
        Q="${2:?usage: voice_log --search '<query>'}"
        sqlite3 -column -header "$DB" "
            SELECT ts, raw_transcript, trigger_word, action
            FROM voice_history
            WHERE raw_transcript LIKE '%$Q%'
            ORDER BY ts DESC LIMIT 50;"
        ;;
    --triggers)
        sqlite3 -column -header "$DB" "
            SELECT trigger_word, action, COUNT(*) AS n
            FROM voice_history
            WHERE trigger_word IS NOT NULL
            GROUP BY trigger_word, action
            ORDER BY n DESC;"
        ;;
    --schema)
        sqlite3 "$DB" ".schema voice_history"
        ;;
    --count)
        echo "rows: $(sqlite3 "$DB" 'SELECT COUNT(*) FROM voice_history;')"
        echo "sessions: $(sqlite3 "$DB" 'SELECT COUNT(DISTINCT session_id) FROM voice_history;')"
        ;;
    *)
        sqlite3 -column -header "$DB" "SELECT * FROM voice_recent;"
        ;;
esac
