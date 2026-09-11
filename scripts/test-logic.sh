#!/usr/bin/env bash
# منطق دوال الخادم — هل تفعل ما وُضعت له؟ على Postgres محلي، بلا مشروع مستضاف.
#
#   ./scripts/test-logic.sh
set -euo pipefail

DB="${DB:-anshatati_logic}"
PSQL="${PSQL:-psql}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

command -v "$PSQL" >/dev/null || { echo "psql غير موجود"; exit 1; }

echo "▸ إعادة إنشاء قاعدة $DB"
dropdb --if-exists "$DB"
createdb "$DB"

run() { "$PSQL" -q -d "$DB" -v ON_ERROR_STOP=1 -f "$1"; }

echo "▸ الطبقة التوافقية مع Supabase"; run "$HERE/supabase/local-harness.sql"
echo "▸ المخطط";                      run "$HERE/supabase/schema.sql"
echo "▸ بيانات الاختبار";              run "$HERE/supabase/local-seed.sql"
echo "▸ محتوى البداية";                run "$HERE/supabase/starter-content.sql"

echo "▸ منطق دوال الخادم"
"$PSQL" -d "$DB" -f "$HERE/supabase/server-logic.sql"

FAILED=$("$PSQL" -t -A -d "$DB" -c "select count(*) from logic_results where verdict like '❌%';" 2>/dev/null || echo 0)
echo
if [ "$FAILED" = "0" ]; then
  echo "✅ كل قاعدة على الخادم تعمل كما وُضعت."
else
  echo "❌ $FAILED قاعدة لا تعمل كما يجب — راجع الجدول أعلاه."
fi
exit "$FAILED"
