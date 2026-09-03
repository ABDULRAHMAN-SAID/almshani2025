using UnityEngine;

namespace Dawnkeep.Rendering
{
    /// <summary>
    /// وصفات أسطح المملكة — لوحة ألوان أصلية للعبة: تربة دافئة، صخر رمادي مائل للبنّي،
    /// عشب جافّ الأطراف لا أخضر صناعي، وحصى نهر فاتح. لا ثلج: مناخ المملكة معتدل جافّ.
    /// </summary>
    public static class SurfaceLibrary
    {
        public static SurfaceRecipe Grass()
        {
            return new SurfaceRecipe
            {
                Name = "grass",
                BaseFrequency = 14,
                Octaves = 6,
                Seed = 20260101u,
                Warp = 0.06f,
                Ridged = false,
                Contrast = 1.20f,
                Low = new Color(0.169f, 0.243f, 0.106f),
                High = new Color(0.435f, 0.545f, 0.239f),
                Patch = new Color(0.573f, 0.529f, 0.290f),
                PatchAmount = 0.24f,
                PatchFrequency = 6,
                NormalStrength = 1.1f,
                Grain = 0.45f,
                GrainFrequency = 96,
            };
        }

        public static SurfaceRecipe Soil()
        {
            return new SurfaceRecipe
            {
                Name = "soil",
                BaseFrequency = 10,
                Octaves = 6,
                Seed = 20260202u,
                Warp = 0.12f,
                Ridged = false,
                Contrast = 1.2f,
                Low = new Color(0.318f, 0.231f, 0.145f),
                High = new Color(0.596f, 0.463f, 0.298f),
                Patch = new Color(0.435f, 0.325f, 0.204f),
                PatchAmount = 0.3f,
                PatchFrequency = 4,
                NormalStrength = 1.5f,
                Grain = 0.5f,
                GrainFrequency = 110,
            };
        }

        public static SurfaceRecipe Rock()
        {
            return new SurfaceRecipe
            {
                Name = "rock",
                BaseFrequency = 4,
                Octaves = 7,
                Seed = 20260303u,
                Warp = 0.18f,
                Ridged = true,
                Stretch = 3.2f,
                Contrast = 1.75f,
                Low = new Color(0.263f, 0.251f, 0.235f),
                High = new Color(0.667f, 0.639f, 0.588f),
                Patch = new Color(0.337f, 0.376f, 0.278f),
                PatchAmount = 0.22f,
                PatchFrequency = 3,
                NormalStrength = 2.6f,
                Grain = 0.3f,
                GrainFrequency = 128,
            };
        }

        public static SurfaceRecipe Gravel()
        {
            return new SurfaceRecipe
            {
                Name = "gravel",
                BaseFrequency = 22,
                Octaves = 4,
                Seed = 20260404u,
                Warp = 0.05f,
                Ridged = false,
                Contrast = 1.9f,
                Low = new Color(0.514f, 0.478f, 0.416f),
                High = new Color(0.812f, 0.776f, 0.702f),
                Patch = new Color(0.639f, 0.596f, 0.522f),
                PatchAmount = 0.2f,
                PatchFrequency = 5,
                NormalStrength = 2.2f,
                Grain = 0.55f,
                GrainFrequency = 150,
            };
        }

        public static SurfaceRecipe Bark()
        {
            return new SurfaceRecipe
            {
                Name = "bark",
                BaseFrequency = 3,
                Octaves = 6,
                Seed = 20260505u,
                Warp = 0.07f,
                Ridged = true,
                Stretch = 9f,
                Contrast = 1.5f,
                Low = new Color(0.161f, 0.129f, 0.102f),
                High = new Color(0.376f, 0.310f, 0.243f),
                Patch = new Color(0.243f, 0.243f, 0.196f),
                PatchAmount = 0.18f,
                PatchFrequency = 4,
                NormalStrength = 2.4f,
                Grain = 0.3f,
                GrainFrequency = 90,
            };
        }
    }
}
