# سجلّ الأصول — مملكة الرماد

قاعدة المشروع (§19 و§58 من المواصفات): **كل أصل في اللعبة أصلي**.
ممنوع أخذ أي صورة أو شبكة أو صوت أو رقم توازن من لعبة أخرى أو من الصور المرجعية.

كل ما في الجدول أدناه **مولَّد بالكود داخل هذا المستودع** — لا ملفّ مستورد من الإنترنت،
ولا أصل من مكتبة خارجية. يمكن إعادة توليد كل شيء بحذف مجلّد `Assets/Dawnkeep/Generated`
وإعادة تنفيذ الخطوات 3 و4 و5.

## خامات الأرض والأسطح

جميعها **مرسومة** لا مولّدة بالضجيج: كل عود وكل حصاة وكل شقّ وكل مدماك مرسوم فعلاً
على `TextureCanvas` بأدوات `TexturePainter`.

| الأصل | المولِّد | الترخيص |
|---|---|---|
| `grass_albedo/normal.png` | `DrawnMaterials.GrassGround` — 15 ألف عود مرسوم | أصلي — هذا المستودع |
| `soil_albedo/normal.png` | `DrawnMaterials.SoilGround` — حصى وشقوق وجذور | أصلي |
| `rock_albedo/normal.png` | `DrawnMaterials.RockGround` — ألواح فورونوي بثلاثة مقاييس وأشنة في المفاصل | أصلي |
| `gravel_albedo/normal.png` | `DrawnMaterials.GravelGround` — حصى متراكب | أصلي |
| `cliff_albedo/normal.png` | `DrawnMaterials.CliffRock` — كتل ضخمة رمادية باردة | أصلي |
| `scree_albedo/normal.png` | `DrawnMaterials.Scree` — شظايا زاويّة لحطام السفح | أصلي |
| `snow_albedo/normal.png` | `DrawnMaterials.Snow` — كثبان ريح وبلّورات وفجوات مزرقّة | أصلي |
| `bark_albedo/normal.png` | `DrawnMaterials.Bark` — أخاديد طولية وعقد | أصلي |
| `stone_albedo/normal.png` | `BuildingMaterials.StoneWall` — مداميك ومونة | أصلي |
| `tile_albedo/normal.png` · `tile_blue_*` | `BuildingMaterials.RoofTile` | أصلي |
| `plaster_albedo/normal.png` | `BuildingMaterials.Plaster` | أصلي |
| `timber_albedo/normal.png` | `BuildingMaterials.Timber` | أصلي |
| `thatch_albedo/normal.png` | `BuildingMaterials.Thatch` | أصلي |

## أهل المملكة والخيل

كلّها **مبنيّة إجرائياً** من أدوات البناء نفسها — لا أصل مأخوذ من أي لعبة أو صورة.
كل صنف شبكتان: بدن لا يُصبغ، وقماش يأخذ لون الراية.

| الأصل | المولِّد | الترخيص |
|---|---|---|
| `Dawnkeep_Folk_Hero_*` | `CharacterMeshFactory.Build(Kind.Hero)` — خوذة بقناع وعُرف وعباءة وسيف مذهّب | أصلي — هذا المستودع |
| `Dawnkeep_Folk_Spearman_*` | `CharacterMeshFactory.Build(Kind.Spearman)` — خوذة مخروطة ورمح ودرع مستدير | أصلي |
| `Dawnkeep_Folk_Swordsman_*` | `CharacterMeshFactory.Build(Kind.Swordsman)` — خوذة بحافّة وسيف ودرع طُرس | أصلي |
| `Dawnkeep_Folk_Archer_*` | `CharacterMeshFactory.Build(Kind.Archer)` — قلنسوة وقوس وجَعبة | أصلي |
| `Dawnkeep_Folk_Villager_*` | `CharacterMeshFactory.Build(Kind.Villager)` — قميص وقبّعة | أصلي |
| `Dawnkeep_Horse_Barded_*` | `HorseMeshFactory.Build(barded: true)` — بسرج وجُلّ | أصلي |
| `Dawnkeep_Horse_Free_*` | `HorseMeshFactory.Build(barded: false)` | أصلي |
| `Dawnkeep_FolkBody.mat` · `Dawnkeep_FolkCloth.mat` | مادّتان بلا خامة صورية — اللون من ألوان الرؤوس | أصلي |

## خامات النبات الشفّافة

| الأصل | المولِّد | الترخيص |
|---|---|---|
| `grass_clump_albedo.png` | `FoliageTextureBaker.GrassClump` — أعواد مرسومة بكسلاً بكسلاً | أصلي |
| `leaf_cluster_albedo.png` | `FoliageTextureBaker.LeafCluster(needles: false)` | أصلي |
| `needle_cluster_albedo.png` | `FoliageTextureBaker.LeafCluster(needles: true)` | أصلي |

## الشبكات والجاهزات

| الأصل | المولِّد | الترخيص |
|---|---|---|
| `Dawnkeep_Broadleaf_0..2` | `TreeMeshFactory.BuildBroadleaf` — جذع متفرّع + بطاقات أوراق | أصلي |
| `Dawnkeep_Conifer_0..2` | `TreeMeshFactory.BuildConifer` — أغصان في دوائر متدرّجة | أصلي |
| `Dawnkeep_Rock_0..3` | `RockMeshFactory` — كرات مشوّهة مكدّسة | أصلي |
| `Dawnkeep_LakeSurface` | `DawnkeepWorldSceneBuilder` من خلايا البحيرة | أصلي |
| `Dawnkeep_RiverSurface` | `DawnkeepWorldSceneBuilder` من مضلّع النهر | أصلي |
| `Dawnkeep_TerrainData` | `DawnkeepTerrainPainter` من حقول التوليد | أصلي |
| `Dawnkeep_Kingdom_*` (5 شبكات) | `KingdomBuilder` + `ArchitectureBuilder` — كنس وخراطة وبثق مشطوف وأقواس شعاعية | أصلي |
| `docs/world_preview_seed3.jpg` | خريطة تحليلية مولّدة بالكود لعالم البذرة 3 | أصلي |
| `docs/renders/unity_preview_*.jpg` | لقطات معاينة مولّدة بالكود (Three.js بلا رأس) | أصلي |

## الشادرات

| الأصل | الوصف | الترخيص |
|---|---|---|
| `Dawnkeep/Foliage` | نبات URP: تمايل ريح من قناة ألفا للرأس، قصّ ألفا، نفاذ ضوء، ظلّ وعمق بنفس الإزاحة | أصلي — مكتوب لهذا المشروع |
| `Dawnkeep/Water` | ماء URP: موجات تحليلية بلا خامة، فرينل، بريق شمس | أصلي |

## الخطوط

| الملفّ | الوصف | الترخيص |
|---|---|---|
| `Art/Fonts/Amiri-Regular.ttf` | خطّ نسخ عربي — نصوص الواجهة | SIL OFL 1.1 (`Amiri-OFL.txt`) |
| `Art/Fonts/Amiri-Bold.ttf` | وزن عريض — العناوين واللافتات | SIL OFL 1.1 |
| `Generated/Fonts/Dawnkeep_Amiri*.asset` | أصلا TextMeshPro، أطلس **ديناميكي** SDF | مولّدان من الخطّ أعلاه |

اختير أميري بعد فحص تغطية أربعة خطوط لأشكال العرض العربية (FE70–FEFF):

| الخطّ | ينقصه من ١٢٦ شكلاً |
|---|---|
| **أميري** | **٠** |
| نوتو نسخ عربي | ٠ (لكنّه متغيّر الوزن) |
| المراعي عريض | ٣٤ |
| تجوال متوسط | ٣٦ |

الناقص في الأخيرَين هو **الصور المفردة** لكل حرف: تكتفي بالحرف الأساسي وتعتمد
على تشكيل OpenType، وهو ما لا يفعله TextMeshPro. فاختيارهما يعني حروفاً غائبة.

## أصول لم تُنشأ بعد

| المطلوب | البديل الحالي |
|---|---|
| مؤثّرات الضرب والموت (جسيمات) | لا شيء بعد — الحركة وحدها تحمل الأثر |
| مزارع وحقول وأسواق | لا شيء بعد |
| أيقونات الواجهة (بناء، ترقية، نور) | لا شيء بعد — الواجهة نصّية بحتة |
| الصوت | نغمات مولّدة في النموذج المتصفّحي فقط |
