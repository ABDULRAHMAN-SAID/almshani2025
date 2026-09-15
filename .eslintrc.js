/**
 * الفحص الساكن للتطبيق.
 *
 * كان package.json يَعِد بـ eslint بلا أن يكون مثبّتًا ولا مضبوطًا، فكان
 * `npm run lint` يقف بخطأ لا يقرأه أحد — وبقيت 47 شاشة و36 مكوّنًا بلا فحص.
 */
module.exports = {
  root: true,
  extends: ["expo"],
  ignorePatterns: ["node_modules/", "docs/app/", "dist/", ".expo/", "android/", "ios/"],
  rules: {
    // خطّاف ينسى تبعية يقرأ قيمة قديمة بصمت — وهذا أخطر ما يمرّ على tsc.
    "react-hooks/exhaustive-deps": "warn",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
  },
};
