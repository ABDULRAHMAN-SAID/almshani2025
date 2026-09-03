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
                BaseFrequency = 8,
                Octaves = 6,
                Seed = 20260101u,
                Warp = 0.06f,
                Ridged = false,
                Contrast = 1.35f,
                Low = new Color(0.208f, 0.263f, 0.157f),
                High = new Color(0.416f, 0.463f, 0.259f),
                Patch = new Color(0.478f, 0.443f, 0.286f),
                PatchAmount = 0.34f,
                PatchFrequency = 3,
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
                BaseFrequency = 6,
                Octaves = 6,
                Seed = 20260202u,
                Warp = 0.12f,
                Ridged = false,
                Contrast = 1.2f,
                Low = new Color(0.271f, 0.216f, 0.157f),
                High = new Color(0.463f, 0.376f, 0.267f),
                Patch = new Color(0.353f, 0.286f, 0.204f),
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
                Low = new Color(0.196f, 0.192f, 0.184f),
                High = new Color(0.478f, 0.463f, 0.427f),
                Patch = new Color(0.298f, 0.318f, 0.251f),
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
                Low = new Color(0.427f, 0.400f, 0.353f),
                High = new Color(0.686f, 0.651f, 0.588f),
                Patch = new Color(0.549f, 0.514f, 0.451f),
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
