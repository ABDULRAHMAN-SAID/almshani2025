# سجلّ الأصول — مملكة الرماد

قاعدة المشروع (§19 و§58 من المواصفات): **كل أصل في اللعبة أصلي**.
ممنوع أخذ أي صورة أو شبكة أو صوت أو رقم توازن من لعبة أخرى أو من الصور المرجعية.

كل ما في الجدول أدناه **مولَّد بالكود داخل هذا المستودع** — لا ملفّ مستورد من الإنترنت،
ولا أصل من مكتبة خارجية. يمكن إعادة توليد كل شيء بحذف مجلّد `Assets/Dawnkeep/Generated`
وإعادة تنفيذ الخطوات 3 و4 و5.

## خامات الأرض والأسطح

| الأصل | المولِّد | الترخيص |
|---|---|---|
| `grass_albedo.png` + `grass_normal.png` | `SurfaceLibrary.Grass()` ← `SurfaceBaker` | أصلي — هذا المستودع |
| `soil_albedo.png` + `soil_normal.png` | `SurfaceLibrary.Soil()` | أصلي |
| `rock_albedo.png` + `rock_normal.png` | `SurfaceLibrary.Rock()` (ضجيج مطويّ ممطوط = طبقات صخرية) | أصلي |
| `gravel_albedo.png` + `gravel_normal.png` | `SurfaceLibrary.Gravel()` | أصلي |
| `bark_albedo.png` + `bark_normal.png` | `SurfaceLibrary.Bark()` | أصلي |

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

## الشادرات

| الأصل | الوصف | الترخيص |
|---|---|---|
| `Dawnkeep/Foliage` | نبات URP: تمايل ريح من قناة ألفا للرأس، قصّ ألفا، نفاذ ضوء، ظلّ وعمق بنفس الإزاحة | أصلي — مكتوب لهذا المشروع |
| `Dawnkeep/Water` | ماء URP: موجات تحليلية بلا خامة، فرينل، بريق شمس | أصلي |

## أصول لم تُنشأ بعد

| المطلوب | البديل الحالي |
|---|---|
| مباني المملكة (قلعة، أبراج، مزارع، سوق) | لا شيء بعد — المرحلة التالية |
| الشخصيات والأعداء | لا شيء بعد |
| خطّ عربي مفتوح الترخيص للواجهة | لم يُضَف بعد (المرحلة التالية مع RTLTMPro) |
| الصوت | نغمات مولّدة في النموذج المتصفّحي فقط |
