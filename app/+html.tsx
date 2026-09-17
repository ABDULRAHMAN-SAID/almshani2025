import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * جذر صفحة الويب.
 *
 * والتطبيق على الهاتف يُجبر على العربية من اليمين (`I18nManager.forceRTL`)،
 * أمّا المتصفّح فلا يسمع ذلك النداء: يقرأ `dir` من الوسم وحده. فبغيرِ هذا
 * الملفّ تخرج الصفحةُ عربيةَ الحروف إنجليزيةَ الترتيب — الأيقونةُ يسارًا
 * والعمودُ الأوّل في الجدول يسارًا — وهو أوّل ما تراه العينُ فتنفر.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="description" content="واجهة — تطبيقٌ وموقعٌ لمشروعك في مساءٍ واحد. جرّب النماذج مجانًا، والاشتراك من ٧٩ ر.ع. للسنة." />
        <title>واجهة — تطبيقٌ لمشروعك</title>
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: BODY }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const BODY = `html, body { background-color: #F7F4EE; }
@media (prefers-color-scheme: dark) { html, body { background-color: #0E1512; } }`;
