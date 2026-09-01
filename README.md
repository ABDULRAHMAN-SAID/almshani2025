# المشني 2025 — مشروع Unity 6

هيكل مشروع **Unity 6** جاهز للفتح، مُعدّ للعمل مع **Claude Code** في صناعة لعبة.

---

## 1) المتطلبات

| الأداة | الملاحظات |
|---|---|
| **Unity Hub** | من `unity.com/download` |
| **Unity 6.3 LTS** (`6000.3.x`) | الإصدار المستقر طويل الدعم. يعمل المشروع مع أي `6000.x` — إن كان لديك 6.5 افتحه به وسيرقّي الملفات تلقائياً |
| **وحدات المنصة** | عند التثبيت اختر: Android Build Support (+ SDK/NDK/JDK) و/أو Windows/Mac Build Support |
| **Git** | لسحب المستودع ودفع التعديلات |
| **Claude Code** | خطوة 3 أدناه |

> **مهم**: Unity لا يعمل داخل جلسة Claude السحابية (لا واجهة رسومية ولا رخصة). المحرر يعمل على جهازك، وClaude Code يعمل بجانبه في نفس المجلد.

---

## 2) فتح المشروع

```bash
git clone https://github.com/ABDULRAHMAN-SAID/almshani2025.git
cd almshani2025
git checkout claude/unity-6-setup-16j376
```

ثم: **Unity Hub ▸ Add ▸ Add project from disk** واختر مجلد `almshani2025`.

الفتح الأول يستغرق دقائق (Unity يولّد `Library/` وبقية `ProjectSettings/` — كلها مُستثناة من Git).

بعد الفتح: من شريط القوائم **Almshani ▸ Create Starter Scene** → يُنشأ مشهد `Assets/Scenes/Main.unity` فيه أرض ولاعب وكاميرا متابعة وإضاءة. اضغط **Play**: `WASD`/الأسهم للحركة و`Space` للقفز.

### أنشأت مشروعاً جديداً من Unity Hub بدل استنساخ هذا المستودع؟

انقل ملفات البداية إلى مشروعك بدل إعادة إنشائها. افتح Terminal/PowerShell **داخل مجلد مشروعك** (المجلد الذي يحوي `Assets` و`Packages` و`ProjectSettings`) ونفّذ:

```bash
git init
git remote add origin https://github.com/ABDULRAHMAN-SAID/almshani2025.git
git fetch origin claude/unity-6-setup-16j376
git checkout origin/claude/unity-6-setup-16j376 -- CLAUDE.md .gitignore .gitattributes Assets/Scripts Assets/Editor
git reset
```

هذا يجلب `CLAUDE.md` والسكربتات وأداة المحرر فقط، ولا يلمس إعدادات مشروعك ولا مشاهدك. ارجع إلى Unity ودعه يصرّف، ثم استخدم القائمة **Almshani ▸ Create Starter Scene**.

> إن اخترت قالب **Universal 3D (URP)** في Unity Hub — وهو الافتراضي في Unity 6 — عدّل السطر الخاص بخط الرندر في `CLAUDE.md` من Built-in RP إلى URP، وتجاهل القسم 7 أدناه.

**كيف تفتح Terminal في مجلد المشروع؟**
- **ويندوز**: افتح المجلد في File Explorer، اكتب `powershell` في شريط العنوان واضغط Enter.
- **ماك**: من Finder، زر يمين على المجلد ← Services ← New Terminal at Folder.
- **من داخل Unity**: زر يمين على مجلد `Assets` في نافذة Project ← `Show in Explorer` / `Reveal in Finder`، ثم اصعد مستوى واحداً للأعلى.

---

## 3) تثبيت Claude Code

**Windows (PowerShell):**
```powershell
irm https://claude.ai/install.ps1 | iex
# أو: winget install Anthropic.ClaudeCode
```

**macOS / Linux:**
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

تحقق ثم شغّله **من داخل مجلد المشروع**:
```bash
claude --version
cd path/to/almshani2025
claude
```

سيقرأ Claude Code ملف `CLAUDE.md` في جذر المشروع تلقائياً (فيه قواعد العمل داخل مشروع Unity).

---

## 4) ربط Claude Code بمحرر Unity (MCP)

بدون ربط: Claude Code يكتب ويقرأ سكربتات C# فقط. **مع الربط**: يقرأ الهرمية والمشاهد وسجل Console، ويحرّك كائنات، ويشغّل Play داخل المحرر.

### الطريق الرسمي (Unity 6 فأحدث)

1. في Unity: **Window ▸ Package Manager ▸ Unity Registry** ← ثبّت حزمة **AI Assistant** (`com.unity.ai.assistant`).
2. **Edit ▸ Project Settings ▸ AI ▸ Unity MCP** — تأكد أن **Unity Bridge** مؤشره أخضر (Running).
3. في القسم **Integrations**: افتحه، اختر **Claude Code**، واضغط **Configure** — يكتب الإعداد نيابةً عنك.
4. أعد تشغيل `claude` في مجلد المشروع، ثم اكتب `/mcp` — يجب أن يظهر خادم Unity متصلاً.

### البديل المجتمعي (يدعم إصدارات أقدم أيضاً)

يتطلب Python 3.10+ و`uv`. في Unity: **Package Manager ▸ + ▸ Add package from git URL**:

```
https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main
```

يفتح معالج إعداد يكتشف عملاء MCP على جهازك — اختر **Claude Code** واضغط **Configure Selected**.

---

## 5) سير العمل المقترح

1. اطلب من Claude Code ما تريده بالعربية: «أضف نظام صحة للاعب وشريط صحة فوق رأسه».
2. يكتب/يعدّل السكربتات في `Assets/Scripts/`.
3. ارجع لنافذة Unity (يعيد التصريف تلقائياً عند استعادة التركيز) وراقب **Console**.
4. أي خطأ تصريف: انسخه لـ Claude Code أو دعه يقرأه بنفسه عبر MCP.
5. المشاهد والـPrefabs تُبنى من المحرر أو بسكربت تحت `Assets/Editor/` — لا تُكتب باليد.

---

## 6) بنية المشروع

```
Assets/
  Scenes/        مشاهد اللعبة (Main.unity يُولَّد من القائمة)
  Scripts/
    Game/        الإقلاع وأنظمة اللعبة العامة
    Player/      تحكم اللاعب والكاميرا
  Editor/        أدوات المحرر (لا تُصرَّف في البناء النهائي)
Packages/        حزم المشروع (manifest.json)
ProjectSettings/ إعدادات المشروع
CLAUDE.md        قواعد العمل لـ Claude Code
```

---

## 7) الترقية إلى URP (اختياري)

المشروع يبدأ بـ **Built-in Render Pipeline** ليفتح بلا أي خطأ. للانتقال إلى URP (موصى به للموبايل):

1. **Package Manager ▸ Unity Registry ▸ Universal RP** ← Install.
2. أنشئ أصل الإعداد: **Assets ▸ Create ▸ Rendering ▸ URP Asset (with Universal Renderer)**.
3. **Project Settings ▸ Graphics** ← ضع الأصل في **Default Render Pipeline**.
4. حوّل الخامات القديمة: **Window ▸ Rendering ▸ Render Pipeline Converter**.

---

## 8) الأصول الثقيلة (Git LFS)

عند إضافة نماذج وأصوات وصور كبيرة:

```bash
git lfs install
git lfs track "*.fbx" "*.png" "*.wav" "*.mp4"
git add .gitattributes
```
