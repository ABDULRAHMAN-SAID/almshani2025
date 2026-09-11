#!/usr/bin/env bash
# هل يستطيع التطبيق أن يفعل ما يحاول فعله؟ — على Postgres محلي، بلا مشروع مستضاف.
#
#   ./scripts/test-operations.sh
#
# يبني قاعدة نظيفة، ويشغّل كل عملية كتابة يقوم بها التطبيق بحساب عضو وبحساب
# إداري، ثم يقارن ما حدث بما يجب أن يحدث.
set -euo pipefail

DB="${DB:-anshatati_ops}"
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

echo "▸ عمليات التطبيق"
"$PSQL" -d "$DB" -f "$HERE/supabase/app-operations.sql"

FAILED=$("$PSQL" -t -A -d "$DB" -c "select count(*) from op_results where verdict like '❌%';" 2>/dev/null || echo 0)
echo
if [ "$FAILED" = "0" ]; then
  echo "✅ كل عملية يقوم بها التطبيق تعمل كما يجب."
else
  echo "❌ $FAILED عملية لا تعمل كما يجب — راجع الجدول أعلاه."
fi
exit "$FAILED"
