#!/usr/bin/env bash
# تشغيل المخطط واختبارات الصلاحيات على Postgres محلي، بلا حاجة إلى مشروع مستضاف.
#
#   ./scripts/test-security.sh
#
# يتطلّب: postgres 14+ يعمل محليًا، ومستخدم له صلاحية إنشاء قواعد بيانات.
# يُنشئ قاعدة اسمها anshatati_test ويحذف السابقة، فلا يمسّ أي بيانات أخرى.
set -euo pipefail

DB="${DB:-anshatati_test}"
PSQL="${PSQL:-psql}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

command -v "$PSQL" >/dev/null || { echo "psql غير موجود"; exit 1; }

echo "▸ إعادة إنشاء قاعدة $DB"
dropdb --if-exists "$DB"
createdb "$DB"

run() { "$PSQL" -q -d "$DB" -v ON_ERROR_STOP=1 -f "$1"; }

echo "▸ الطبقة التوافقية مع Supabase"
run "$HERE/supabase/local-harness.sql"

echo "▸ المخطط"
run "$HERE/supabase/schema.sql"

echo "▸ بيانات الاختبار"
run "$HERE/supabase/local-seed.sql"

echo "▸ اختبارات الصلاحيات العدائية"
sed \
  -e "s|v_a uuid := '00000000-0000-0000-0000-00000000000a';|v_a uuid := '11111111-1111-1111-1111-111111111111';|" \
  -e "s|v_b uuid := '00000000-0000-0000-0000-00000000000b';|v_b uuid := '22222222-2222-2222-2222-222222222222';|" \
  "$HERE/supabase/security-tests.sql" > "/tmp/anshatati-security-tests.sql"
"$PSQL" -d "$DB" -f "/tmp/anshatati-security-tests.sql"

FAILED=$("$PSQL" -t -A -d "$DB" -c "select count(*) from public.security_test_results where verdict like '❌%';")
echo
if [ "$FAILED" = "0" ]; then
  echo "✅ كل الاختبارات نجحت."
else
  echo "❌ $FAILED اختبارًا فشل — راجع الجدول أعلاه."
fi
exit "$FAILED"
