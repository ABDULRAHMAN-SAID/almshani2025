using Dawnkeep.Combat;
using Dawnkeep.Rendering;
using UnityEngine;

namespace Dawnkeep.Building
{
    /// <summary>
    /// مبنى قائم على عقدة: بيانات وحالة وشكل. **بلا `Update`** — تماماً كـ`Unit`.
    ///
    /// `BuildingDirector` يمرّ على كل المباني في حلقة واحدة. عشرون مبنى تعني
    /// عشرين قفزة إلى كود مُدار في كل إطار لو حمل كلٌّ منها `Update` خاصّاً به.
    /// </summary>
    [DisallowMultipleComponent]
    public class Building : MonoBehaviour
    {
        private BuildingDefinition _definition;
        private BuildNode _node;
        private Transform _transform;

        private float _health;
        private int _totalPaid;
        private float _nextShot;
        private float _builtAt;

        private Renderer[] _renderers;
        private MaterialPropertyBlock _block;

        /// <summary>
        /// حرّاس هذا المبنى. **يملكهم**: يذهبون معه عند الترقية والهدم والبيع.
        /// بلا هذه القائمة تُضاف حاميةُ المستوى الثاني فوق الأولى، فتصير ثكنةٌ
        /// رُقّيت مرّةً عشرةَ حرّاس بدل ستّة — و§10 تقول «ينشئ 6» لا «يضيف».
        /// </summary>
        private readonly System.Collections.Generic.List<Unit> _guards =
            new System.Collections.Generic.List<Unit>(8);

        /// <summary>حرّاس المبنى — للقراءة، يستعملها قائد البناء.</summary>
        public System.Collections.Generic.IReadOnlyList<Unit> Guards { get { return _guards; } }

        /// <summary>المبنى قائم ولم يُهدَم.</summary>
        public bool Alive { get; private set; }

        public BuildingDefinition Definition { get { return _definition; } }

        public BuildNode Node { get { return _node; } }

        public Transform Body { get { return _transform; } }

        public float Health { get { return _health; } }

        /// <summary>إجمالي ما دُفع فيه وفي ترقياته — أساس ثمن البيع (§10).</summary>
        public int TotalPaid { get { return _totalPaid; } }

        public float NextShot { get { return _nextShot; } set { _nextShot = value; } }

        /// <summary>ما زال في حركة البناء القصيرة، فلا يرمي ولا يُنتج بعد.</summary>
        public bool Raising
        {
            get { return _definition != null && Time.time < _builtAt + _definition.BuildSeconds; }
        }

        /// <summary>نسبة اكتمال حركة البناء، من صفر إلى واحد.</summary>
        public float RaiseProgress
        {
            get
            {
                if (_definition == null || _definition.BuildSeconds <= 0f)
                {
                    return 1f;
                }

                return Mathf.Clamp01((Time.time - _builtAt) / _definition.BuildSeconds);
            }
        }

        private void Awake()
        {
            _transform = transform;
            _block = new MaterialPropertyBlock();
        }

        /// <summary>يقيم المبنى على عقدته. `paid` إجمالي ما دُفع حتى الآن.</summary>
        public void Raise(BuildingDefinition definition, BuildNode node, int paid, uint seed)
        {
            if (_transform == null)
            {
                Awake();
            }

            _definition = definition;
            _node = node;
            _totalPaid = paid;
            _health = definition.MaxHealth;
            _nextShot = 0f;
            _builtAt = Time.time;
            Alive = true;

            BuildShape(definition, seed);
        }

        /// <summary>يسجّل حارساً في ملك هذا المبنى.</summary>
        public void AddGuard(Unit guard)
        {
            if (guard != null)
            {
                _guards.Add(guard);
            }
        }

        /// <summary>يصرف حرّاسه ويخلي قائمتهم — عند الترقية والهدم.</summary>
        public void DismissGuards()
        {
            for (int i = 0; i < _guards.Count; i++)
            {
                Unit guard = _guards[i];
                if (guard == null)
                {
                    continue;
                }

                // الشطب قبل الهدم لا بعده: الحلقة القتالية تقرأ موضع كل وحدة
                // مسجَّلة، فمرجعٌ إلى كائن مهدوم يكسرها.
                CombatDirector director = CombatDirector.Instance;
                if (director != null)
                {
                    director.Unregister(guard);
                }

                guard.Despawn();
                Destroy(guard.gameObject);
            }

            _guards.Clear();
        }

        /// <summary>يضيف ثمن ترقية إلى إجماليه، ويعيد بناء شكله بتعريفه الجديد.</summary>
        public void UpgradeTo(BuildingDefinition definition, int extraPaid, uint seed)
        {
            _totalPaid += extraPaid;
            DismissGuards();

            // الصحّة تُملأ عند الترقية: المبنى أُعيد بناؤه لا رُقِّع
            _definition = definition;
            _health = definition.MaxHealth;
            _builtAt = Time.time;
            _nextShot = 0f;

            BuildShape(definition, seed);
        }

        /// <summary>يعيد true إن هدمت هذه الضربة المبنى.</summary>
        public bool TakeDamage(float amount)
        {
            if (!Alive)
            {
                return false;
            }

            _health -= amount;
            if (_health > 0f)
            {
                TintByHealth();
                return false;
            }

            _health = 0f;
            Alive = false;
            return true;
        }

        /// <summary>يزيل المبنى ويترك عقدته خالية.</summary>
        public void Remove()
        {
            Alive = false;
            DismissGuards();

            if (_node != null)
            {
                _node.Clear();
            }

            Destroy(gameObject);
        }

        // ── الشكل ───────────────────────────────────────────────────────────

        private void BuildShape(BuildingDefinition definition, uint seed)
        {
            for (int i = _transform.childCount - 1; i >= 0; i--)
            {
                // الإخفاء فوري والهدم مؤجَّل إلى آخر الإطار: بلا الإخفاء يُرسم
                // الشكل القديم فوق الجديد إطاراً كاملاً عند الترقية.
                GameObject old = _transform.GetChild(i).gameObject;
                old.SetActive(false);
                Destroy(old);
            }

            BuildingMeshFactory.Parts parts = BuildingMeshFactory.Build(definition.Shape, seed);

            System.Collections.Generic.List<Renderer> list =
                new System.Collections.Generic.List<Renderer>(4);

            AddPart(list, "Stone", parts.Stone, "Dawnkeep_Stone");
            AddPart(list, "Timber", parts.Timber, "Dawnkeep_Timber");
            AddPart(list, "Thatch", parts.Thatch, "Dawnkeep_Thatch");
            AddPart(list, "Plaster", parts.Plaster, "Dawnkeep_Plaster");

            _renderers = list.ToArray();
            TintByHealth();
        }

        private void AddPart(System.Collections.Generic.List<Renderer> list, string name,
            MeshBuilder builder, string materialName)
        {
            if (builder.VertexCount == 0)
            {
                return;
            }

            GameObject go = new GameObject(name);
            go.transform.SetParent(_transform, false);
            go.AddComponent<MeshFilter>().sharedMesh = builder.ToMesh("Dawnkeep_Build_" + name, true);

            MeshRenderer renderer = go.AddComponent<MeshRenderer>();
            Material material = BuildingMaterials.Find(materialName);
            if (material != null)
            {
                renderer.sharedMaterial = material;
            }

            list.Add(renderer);
        }

        /// <summary>
        /// المبنى الجريح يقتم. لا شريط صحّة فوق كل مبنى: عشرون شريطاً تحجب
        /// الساحة، واقتمام الحجر يُقرأ من بعيد ولا يزاحم شيئاً.
        /// </summary>
        private void TintByHealth()
        {
            if (_renderers == null || _definition == null)
            {
                return;
            }

            float ratio = Mathf.Clamp01(_health / Mathf.Max(1f, _definition.MaxHealth));
            float shade = Mathf.Lerp(0.42f, 1f, ratio);
            Color tint = new Color(shade, shade * 0.97f, shade * 0.94f, 1f);

            for (int i = 0; i < _renderers.Length; i++)
            {
                _renderers[i].GetPropertyBlock(_block);
                _block.SetColor(BuildingMaterials.BaseColorId, tint);
                _renderers[i].SetPropertyBlock(_block);
            }
        }
    }
}
