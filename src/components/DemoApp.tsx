import { Fragment, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { arabicDigits, monogram, omr, whatsappLink } from "@/product/format";
import { KIND } from "@/product/kinds";
import type { Offer, Project, Template } from "@/product/types";

/**
 * التطبيق التجريبيّ — يعمل، لا يُعرض.
 *
 * وهذا هو المنتج كلّه: صاحب المشروع لا يشتري «تصميمًا» بل تطبيقًا سيستعمله
 * زبونه. فما يُعرض هنا يُضغط ويُملأ ويُحجز: السلّة تزيد، والموعد يُختار،
 * والدرس يُفتح. ولو عُرضت صورةٌ ساكنة لقُرئت مُخطَّطًا لا تطبيقًا — وفرقُ
 * ما بينهما هو فرقُ «جميل» و«أريده».
 *
 * ومكوّنٌ واحد لستّة أنواع لا ستّة ملفّات: الهيكل واحد — صدرٌ وجسمٌ وشريط
 * تبويب — والاختلاف في شاشات الجسم. ولو فُصلت لصار إصلاحُ خطأٍ في الأسعار
 * ستّة إصلاحات، ولتباعدت الأنواع حتى لا يُعرف أيّها الأصل.
 *
 * ويُعرض في موضعين: مصغَّرًا داخل إطار الهاتف في المعرض — ساكنًا بحالةٍ
 * مهيّأة تبدو حيّة — وبحجمه الكامل في التجربة، وهناك يعمل كلّ شيء.
 */

interface DemoAppProps {
  project: Project;
  template: Template;
  /** في المعرض لا يُضغط: صورةٌ حيّة لا تطبيقٌ داخل تطبيق. */
  interactive?: boolean;
}

/** أوقاتٌ معروضة للحجز — ثابتة، فالمعرض ليس ساعة. */
const SLOTS = ["٩:٠٠", "١٠:٣٠", "١٢:٠٠", "٤:٣٠", "٥:٣٠", "٦:٣٠", "٧:٣٠", "٨:٣٠"];
const DAYS = [
  { day: "السبت", date: "١٩" },
  { day: "الأحد", date: "٢٠" },
  { day: "الإثنين", date: "٢١" },
  { day: "الثلاثاء", date: "٢٢" },
  { day: "الأربعاء", date: "٢٣" },
];

export function DemoApp({ project, template, interactive = false }: DemoAppProps) {
  const skin = template.skin;
  const brand = project.brand ?? skin.brand;
  const meta = KIND[project.kind];

  const [tab, setTab] = useState(0);
  // حالةٌ مهيّأة: المعرض يُري سلّةً فيها شيء وموعدًا مختارًا، فيبدو التطبيق
  // مستعملًا لا فارغًا. والفارغ يُقرأ «غير جاهز».
  const [cart, setCart] = useState<Record<string, number>>(() => {
    const first = project.offers[0]?.id;
    const second = project.offers[2]?.id;
    return first ? { [first]: 2, ...(second ? { [second]: 1 } : {}) } : {};
  });
  const [slot, setSlot] = useState(3);
  const [day, setDay] = useState(1);
  const [pick, setPick] = useState(0);

  const lines = useMemo(
    () => project.offers.filter((offer) => (cart[offer.id] ?? 0) > 0),
    [project.offers, cart]
  );
  const total = lines.reduce((sum, offer) => sum + offer.price * (cart[offer.id] ?? 0), 0);
  const count = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const add = (id: string, by: number) =>
    interactive && setCart((state) => {
      const next = Math.max(0, (state[id] ?? 0) + by);
      const copy = { ...state };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });

  const order = () => {
    if (!interactive) return;
    const body = lines.map((offer) => `${offer.name} × ${arabicDigits(cart[offer.id] ?? 0)}`).join("، ");
    const text = `طلب من ${project.name}: ${body} — الإجمالي ${omr(total)}`;
    void Linking.openURL(
      `https://wa.me/${project.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`
    ).catch(() => undefined);
  };

  const confirm = () => {
    if (!interactive) return;
    const who = project.people[pick]?.name;
    const text = `حجز في ${project.name}: ${DAYS[day].day} ${DAYS[day].date} الساعة ${SLOTS[slot]}${who ? ` مع ${who}` : ""}`;
    void Linking.openURL(
      `https://wa.me/${project.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`
    ).catch(() => undefined);
  };

  const P = { skin, brand, project, interactive };

  return (
    <View style={[styles.app, { backgroundColor: skin.paper }]}>
      <Header skin={skin} brand={brand} project={project} />

      {/* ——— الجسم ——— */}
      <ScrollView
        style={[
          styles.body,
          // اللافتةُ العريضة تعلوها صفحةٌ مستديرة الطرفين — وهي ما يجعل
          // المطعم مطعمًا لا نسخةً ملوّنة من العيادة.
          skin.header === "band" ? { marginTop: -20, borderTopStartRadius: 24, borderTopEndRadius: 24, backgroundColor: skin.paper } : null,
        ]}
        contentContainerStyle={[styles.bodyPad, skin.nav === "pill" ? styles.bodyPadFloating : null]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={interactive}
      >
        {project.kind === "restaurant" || project.kind === "store" ? (
          tab === 0 ? (
            <Catalogue {...P} cart={cart} add={add} label={meta.offerLabel} />
          ) : tab === 1 ? (
            <Cart {...P} lines={lines} cart={cart} add={add} total={total} order={order} />
          ) : (
            <About {...P} />
          )
        ) : null}

        {project.kind === "booking" || project.kind === "salon" ? (
          tab === 0 && project.kind === "salon" ? (
            <Services {...P} label={meta.offerLabel} />
          ) : (project.kind === "booking" && tab === 0) || (project.kind === "salon" && tab === 1) ? (
            <Booking {...P} day={day} setDay={setDay} slot={slot} setSlot={setSlot} pick={pick} setPick={setPick} confirm={confirm} />
          ) : project.kind === "booking" && tab === 1 ? (
            <MyBookings {...P} />
          ) : project.kind === "salon" && tab === 2 ? (
            <Team {...P} pick={pick} setPick={setPick} />
          ) : (
            <About {...P} />
          )
        ) : null}

        {project.kind === "clinic" ? (
          tab === 0 ? (
            <Team {...P} pick={pick} setPick={setPick} doctors />
          ) : tab === 1 ? (
            <Booking {...P} day={day} setDay={setDay} slot={slot} setSlot={setSlot} pick={pick} setPick={setPick} confirm={confirm} />
          ) : (
            <About {...P} />
          )
        ) : null}

        {project.kind === "academy" ? (
          tab === 0 ? (
            <Courses {...P} />
          ) : tab === 1 ? (
            <MyCourses {...P} />
          ) : (
            <About {...P} />
          )
        ) : null}
      </ScrollView>

      <Nav
        skin={skin}
        brand={brand}
        tabs={meta.tabs}
        tab={tab}
        setTab={(next) => interactive && setTab(next)}
        count={count}
      />
    </View>
  );
}

/* ========================= الشاشات ========================= */

interface Common {
  skin: Template["skin"];
  brand: string;
  project: Project;
  interactive: boolean;
}

/**
 * ما يُباع — بثلاث بِنًى لا بلونٍ واحد.
 *
 * `menu` قائمةُ مطعم: لكل صنفٍ بطاقتُه ومربّعُه، فالعين تلتقط الصنف كما
 * تلتقطه في القائمة الورقية. و`grid` رفوفُ متجر: مربّعان في السطر وصورةٌ
 * فوق الاسم. و`rows` أسطرٌ هادئةٌ في بطاقةٍ واحدة، لمن يبيع خدمةً لا سلعة.
 */
function Catalogue({
  skin, brand, project, interactive, cart, add, label,
}: Common & {
  cart: Record<string, number>;
  add: (id: string, by: number) => void;
  label: string;
}) {
  const groups = groupBy(project.offers, label);
  const shape = skin.list;
  let seen = 0;

  return (
    <>
      {Object.entries(groups).map(([category, items]) => (
        <View key={category} style={styles.block}>
          <Title text={category} skin={skin} brand={brand} />

          {shape === "grid" ? (
            <View style={styles.grid}>
              {items.map((offer) => {
                const first = seen++ === 0;
                return (
                  <View key={offer.id} style={[styles.tile, { backgroundColor: skin.card, borderRadius: skin.radius }]}>
                    <View style={[styles.tileArt, { backgroundColor: `${brand}12`, borderRadius: skin.radius - 4 }]}>
                      <Ionicons name="cube-outline" size={24} color={`${brand}99`} />
                      {first ? (
                        <View style={[styles.tileTag, { backgroundColor: brand }]}>
                          <Text style={styles.tileTagText}>الأكثر طلبًا</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.tileName, { color: skin.text }]} numberOfLines={1}>{offer.name}</Text>
                    {offer.note ? (
                      <Text style={[styles.tileNote, { color: skin.muted }]} numberOfLines={1}>{offer.note}</Text>
                    ) : null}
                    <View style={styles.tileFoot}>
                      <Text style={[styles.price, { color: brand }]}>{omr(offer.price)}</Text>
                      <Stepper qty={cart[offer.id] ?? 0} onAdd={(by) => add(offer.id, by)} brand={brand} enabled={interactive} />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : shape === "menu" ? (
            <View style={{ gap: 9 }}>
              {items.map((offer) => (
                <View key={offer.id} style={[styles.dish, { backgroundColor: skin.card, borderRadius: skin.radius }]}>
                  <View style={[styles.dishArt, { backgroundColor: `${brand}12`, borderRadius: skin.radius - 5 }]}>
                    <Ionicons name="restaurant-outline" size={21} color={`${brand}AA`} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.rowName, { color: skin.text }]}>{offer.name}</Text>
                    <Text style={[styles.rowNote, { color: skin.muted }]} numberOfLines={1}>
                      {offer.note ?? category}
                    </Text>
                    <Text style={[styles.price, { color: brand }]}>{omr(offer.price)}</Text>
                  </View>
                  <Stepper qty={cart[offer.id] ?? 0} onAdd={(by) => add(offer.id, by)} brand={brand} enabled={interactive} />
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: skin.card, borderRadius: skin.radius }]}>
              {items.map((offer, index) => (
                <Fragment key={offer.id}>
                  {index > 0 ? <Divider skin={skin} /> : null}
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowName, { color: skin.text }]}>{offer.name}</Text>
                      {offer.note ? <Text style={[styles.rowNote, { color: skin.muted }]}>{offer.note}</Text> : null}
                    </View>
                    <Text style={[styles.price, { color: brand }]}>{omr(offer.price)}</Text>
                    <Stepper qty={cart[offer.id] ?? 0} onAdd={(by) => add(offer.id, by)} brand={brand} enabled={interactive} />
                  </View>
                </Fragment>
              ))}
            </View>
          )}
        </View>
      ))}
    </>
  );
}

/** السلّة: ما اختاره، والإجمالي، وطلبٌ يصل واتساب صاحب المحل. */
function Cart({
  skin, brand, interactive, lines, cart, add, total, order,
}: Common & {
  lines: Offer[];
  cart: Record<string, number>;
  add: (id: string, by: number) => void;
  total: number;
  order: () => void;
}) {
  if (lines.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="bag-outline" size={34} color={skin.muted} />
        <Text style={[styles.emptyText, { color: skin.muted }]}>سلّتك فارغة</Text>
      </View>
    );
  }
  return (
    <View style={styles.block}>
      <Title text="سلّتك" skin={skin} brand={brand} />
      <View style={[styles.card, { backgroundColor: skin.card, borderRadius: skin.radius }]}>
        {lines.map((offer, index) => (
          <Fragment key={offer.id}>
            {index > 0 ? <Divider skin={skin} /> : null}
            <View style={styles.row}>
              <Text style={[styles.rowName, { color: skin.text, flex: 1 }]}>{offer.name}</Text>
              <Text style={[styles.price, { color: brand }]}>{omr(offer.price * (cart[offer.id] ?? 0))}</Text>
              <Stepper qty={cart[offer.id] ?? 0} onAdd={(by) => add(offer.id, by)} brand={brand} enabled={interactive} />
            </View>
          </Fragment>
        ))}
        <Divider skin={skin} />
        <View style={styles.row}>
          <Text style={[styles.totalLabel, { color: skin.text }]}>الإجمالي</Text>
          <Text style={[styles.totalValue, { color: brand }]}>{omr(total)}</Text>
        </View>
      </View>
      <Big label="أرسل الطلب عبر واتساب" icon="logo-whatsapp" onPress={order} color="#1FA855" radius={skin.radius} />
      <Text style={[styles.hint, { color: skin.muted }]}>
        يصل الطلب مكتوبًا إلى واتساب المحل — بلا عمولة ولا وسيط.
      </Text>
    </View>
  );
}

/** خدماتُ الصالون بمدّتها — المدّة تُغيّر القرار كما يُغيّره السعر. */
function Services({ skin, brand, project, interactive, label }: Common & { label: string }) {
  return (
    <View style={styles.block}>
      <Title text={label} skin={skin} brand={brand} />
      <View style={[styles.card, { backgroundColor: skin.card, borderRadius: skin.radius }]}>
        {project.offers.map((offer, index) => (
          <Fragment key={offer.id}>
            {index > 0 ? <Divider skin={skin} /> : null}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowName, { color: skin.text }]}>{offer.name}</Text>
                <Text style={[styles.rowNote, { color: skin.muted }]}>
                  {offer.minutes ? `${arabicDigits(offer.minutes)} دقيقة` : offer.note ?? ""}
                </Text>
              </View>
              <Text style={[styles.price, { color: brand }]}>{omr(offer.price)}</Text>
            </View>
          </Fragment>
        ))}
      </View>
      <MiniInfo skin={skin} brand={brand} project={project} interactive={interactive} />
    </View>
  );
}

/** الحجز: خدمةٌ ثم يومٌ ثم ساعة — ثلاث لمسات لا نموذجٌ يُملأ. */
function Booking({
  skin, brand, project, interactive, day, setDay, slot, setSlot, pick, setPick, confirm,
}: Common & {
  day: number; setDay: (value: number) => void;
  slot: number; setSlot: (value: number) => void;
  pick: number; setPick: (value: number) => void;
  confirm: () => void;
}) {
  return (
    <>
      {project.people.length > 0 ? (
        <View style={styles.block}>
          <Title text="اختر من" skin={skin} brand={brand} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEnabled={interactive}>
            <View style={styles.peopleRow}>
              {project.people.map((person, index) => {
                const on = index === pick;
                return (
                  <Pressable
                    key={person.id}
                    accessibilityRole="button"
                    onPress={() => interactive && setPick(index)}
                    style={[
                      styles.person,
                      { backgroundColor: skin.card, borderRadius: skin.radius, borderColor: on ? brand : "transparent" },
                    ]}
                  >
                    <View style={[styles.avatar, { backgroundColor: `${brand}18` }]}>
                      <Text style={[styles.avatarText, { color: brand }]}>{person.name[0]}</Text>
                    </View>
                    <Text style={[styles.personName, { color: skin.text }]} numberOfLines={1}>{person.name}</Text>
                    <Text style={[styles.personRole, { color: skin.muted }]} numberOfLines={1}>{person.role}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.block}>
        <Title text="اليوم" skin={skin} brand={brand} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEnabled={interactive}>
          <View style={styles.daysRow}>
            {DAYS.map((entry, index) => {
              const on = index === day;
              return (
                <Pressable
                  key={entry.day}
                  accessibilityRole="button"
                  onPress={() => interactive && setDay(index)}
                  style={[
                    styles.day,
                    { borderRadius: skin.radius, backgroundColor: on ? brand : skin.card },
                  ]}
                >
                  <Text style={[styles.dayName, { color: on ? "#FFF" : skin.muted }]}>{entry.day}</Text>
                  <Text style={[styles.dayDate, { color: on ? "#FFF" : skin.text }]}>{entry.date}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View style={styles.block}>
        <Title text="الساعة" skin={skin} brand={brand} />
        <View style={styles.slots}>
          {SLOTS.map((time, index) => {
            const on = index === slot;
            const off = index === 2 || index === 6; // محجوزٌ — الجدول الممتلئ يُصدَّق
            return (
              <Pressable
                key={time}
                accessibilityRole="button"
                disabled={off}
                onPress={() => interactive && setSlot(index)}
                style={[
                  styles.slot,
                  {
                    borderRadius: skin.radius - 4,
                    backgroundColor: on ? brand : skin.card,
                    opacity: off ? 0.38 : 1,
                    borderColor: on ? brand : `${skin.muted}33`,
                  },
                ]}
              >
                <Text style={[styles.slotText, { color: on ? "#FFF" : off ? skin.muted : skin.text }]}>
                  {time}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Big label="أكّد الحجز" icon="checkmark-circle" onPress={confirm} color={brand} radius={skin.radius} />
      <Text style={[styles.hint, { color: skin.muted }]}>
        يصلك التأكيد على واتساب، ويُسجَّل الموعد في «حجوزاتي».
      </Text>
    </>
  );
}

/** حجوزاتٌ قائمة — تُري أن التطبيق يتذكّر، لا أنه نموذجُ إرسال. */
function MyBookings({ skin, brand, project }: Common) {
  const rows = [
    { name: project.offers[0]?.name ?? "خدمة", when: "الأحد ٢٠ · ٤:٣٠ م", state: "مؤكّد" },
    { name: project.offers[1]?.name ?? "خدمة", when: "الخميس ٢٤ · ٦:٠٠ م", state: "بانتظار التأكيد" },
  ];
  return (
    <View style={styles.block}>
      <Title text="حجوزاتي" skin={skin} brand={brand} />
      {rows.map((row) => (
        <View key={row.when} style={[styles.card, styles.bookingCard, { backgroundColor: skin.card, borderRadius: skin.radius }]}>
          <View style={[styles.bookingTick, { backgroundColor: brand }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowName, { color: skin.text }]}>{row.name}</Text>
            <Text style={[styles.rowNote, { color: skin.muted }]}>{row.when}</Text>
          </View>
          <View style={[styles.state, { backgroundColor: `${brand}14` }]}>
            <Text style={[styles.stateText, { color: brand }]}>{row.state}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * فريقٌ أو أطبّاء.
 *
 * والعيادةُ تعرضهم بطاقاتٍ منفصلة لا أسطرًا في بطاقةٍ واحدة: المريض يختار
 * الطبيب أوّلًا ثم الموعد، فالاسمُ عنده عنوانٌ لا سطرٌ في جدول. والصالونُ
 * يعرضهم أسطرًا، لأن الخدمةَ عنده هي المقصودة والفنّيّةُ تبعٌ لها.
 */
function Team({
  skin, brand, project, interactive, pick, setPick, doctors,
}: Common & { pick: number; setPick: (value: number) => void; doctors?: boolean }) {
  if (skin.list === "cards") {
    return (
      <View style={styles.block}>
        <Title text={doctors ? "الأطباء" : "الفريق"} skin={skin} brand={brand} />
        {project.people.map((person, index) => {
          const on = index === pick;
          return (
            <Pressable
              key={person.id}
              accessibilityRole="button"
              onPress={() => interactive && setPick(index)}
              style={[
                styles.docCard,
                {
                  backgroundColor: skin.card,
                  borderRadius: skin.radius,
                  borderColor: on ? brand : `${skin.muted}1F`,
                },
              ]}
            >
              <View style={[styles.docAvatar, { backgroundColor: `${brand}14` }]}>
                <Text style={[styles.docAvatarText, { color: brand }]}>
                  {person.name.replace("د. ", "")[0]}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.rowName, { color: skin.text }]}>{person.name}</Text>
                <View style={[styles.docRole, { backgroundColor: `${brand}12` }]}>
                  <Text style={[styles.docRoleText, { color: brand }]}>{person.role}</Text>
                </View>
                {person.next ? (
                  <View style={styles.docNext}>
                    <Ionicons name="time-outline" size={12} color={skin.muted} />
                    <Text style={[styles.rowNote, { color: skin.muted }]}>{`أقرب موعد: ${person.next}`}</Text>
                  </View>
                ) : null}
              </View>
              <View style={[styles.docBook, { backgroundColor: on ? brand : `${brand}12`, borderRadius: skin.radius - 4 }]}>
                <Text style={[styles.docBookText, { color: on ? "#FFF" : brand }]}>
                  {on ? "مُختار" : "احجز"}
                </Text>
              </View>
            </Pressable>
          );
        })}
        <MiniInfo skin={skin} brand={brand} project={project} interactive={interactive} />
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <Title text={doctors ? "الأطباء" : "الفريق"} skin={skin} brand={brand} />
      <View style={[styles.card, { backgroundColor: skin.card, borderRadius: skin.radius }]}>
        {project.people.map((person, index) => (
          <Fragment key={person.id}>
            {index > 0 ? <Divider skin={skin} /> : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => interactive && setPick(index)}
              style={styles.row}
            >
              <View style={[styles.avatar, { backgroundColor: `${brand}18` }]}>
                <Text style={[styles.avatarText, { color: brand }]}>{person.name.replace("د. ", "")[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowName, { color: skin.text }]}>{person.name}</Text>
                <Text style={[styles.rowNote, { color: skin.muted }]}>{person.role}</Text>
              </View>
              {person.next ? (
                <View style={[styles.state, { backgroundColor: `${brand}14` }]}>
                  <Text style={[styles.stateText, { color: brand }]}>{person.next}</Text>
                </View>
              ) : null}
              {index === pick ? <Ionicons name="checkmark-circle" size={18} color={brand} /> : null}
            </Pressable>
          </Fragment>
        ))}
      </View>
    </View>
  );
}

/** الدورات — لكلٍّ غلافُها وسعرُها وعددُ دروسها، فلا يُشترى مجهول. */
function Courses({ skin, brand, project }: Common) {
  return (
    <View style={styles.block}>
      <Title text="الدورات" skin={skin} brand={brand} />
      {project.courses.map((course, index) => (
        <View key={course.id} style={[styles.courseWrap, { backgroundColor: skin.card, borderRadius: skin.radius }]}>
          <LinearGradient
            colors={index % 2 === 0 ? [brand, skin.brandDeep] : [skin.brandDeep, brand]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.courseCover}
          >
            <Ionicons name="play-circle" size={26} color="rgba(255,255,255,0.9)" />
            <Text style={styles.courseLessons}>{`${arabicDigits(course.lessons)} درسًا`}</Text>
          </LinearGradient>
          <View style={styles.courseBody}>
            <Text style={[styles.rowName, { color: skin.text }]} numberOfLines={1}>{course.name}</Text>
            <Text style={[styles.rowNote, { color: skin.muted }]}>{course.teacher}</Text>
            <View style={styles.courseFoot}>
              <Text style={[styles.price, { color: brand }]}>{omr(course.price)}</Text>
              <View style={[styles.courseGo, { backgroundColor: `${brand}12`, borderRadius: skin.radius - 6 }]}>
                <Text style={[styles.courseGoText, { color: brand }]}>
                  {course.done > 0 ? "تابع" : "ابدأ"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

/** دوراتي — شريطُ تقدّمٍ يقول أين وقف، وهو ما يُعيده غدًا. */
function MyCourses({ skin, brand, project }: Common) {
  const mine = project.courses.filter((course) => course.done > 0);
  return (
    <View style={styles.block}>
      <Title text="دوراتي" skin={skin} brand={brand} />
      {mine.map((course) => {
        const ratio = course.lessons > 0 ? course.done / course.lessons : 0;
        const finished = course.done >= course.lessons;
        return (
          <View key={course.id} style={[styles.card, { backgroundColor: skin.card, borderRadius: skin.radius, padding: 14, gap: 8 }]}>
            <View style={styles.courseHead}>
              <Text style={[styles.rowName, { color: skin.text, flex: 1 }]}>{course.name}</Text>
              {finished ? (
                <View style={[styles.state, { backgroundColor: `${brand}14` }]}>
                  <Text style={[styles.stateText, { color: brand }]}>شهادة</Text>
                </View>
              ) : null}
            </View>
            <View style={[styles.track, { backgroundColor: `${skin.muted}22` }]}>
              <View style={[styles.fill, { backgroundColor: brand, width: `${Math.round(ratio * 100)}%` }]} />
            </View>
            <Text style={[styles.rowNote, { color: skin.muted }]}>
              {`${arabicDigits(course.done)} من ${arabicDigits(course.lessons)} درسًا`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** عنّا — نبذةٌ وأوقاتٌ وتواصل، في كل نوع. */
function About({ skin, brand, project, interactive }: Common) {
  const call = () => interactive && void Linking.openURL(`tel:${project.phone}`).catch(() => undefined);
  const chat = () =>
    interactive && void Linking.openURL(whatsappLink(project.whatsapp, project.name)).catch(() => undefined);
  return (
    <>
      <View style={styles.block}>
        <Title text="عن المشروع" skin={skin} brand={brand} />
        <Text style={[styles.about, { color: skin.muted }]}>{project.about}</Text>
      </View>

      <View style={styles.block}>
        <Title text="أوقات العمل" skin={skin} brand={brand} />
        <View style={[styles.card, { backgroundColor: skin.card, borderRadius: skin.radius }]}>
          {project.hours.map((entry, index) => (
            <Fragment key={entry.days}>
              {index > 0 ? <Divider skin={skin} /> : null}
              <View style={styles.row}>
                <Text style={[styles.rowName, { color: skin.text, flex: 1 }]}>{entry.days}</Text>
                <Text style={[styles.rowNote, { color: skin.muted }]}>{entry.hours}</Text>
              </View>
            </Fragment>
          ))}
        </View>
      </View>

      <View style={styles.block}>
        <Title text="التواصل" skin={skin} brand={brand} />
        <View style={styles.pair}>
          <Pressable accessibilityRole="button" onPress={chat} style={[styles.half, { backgroundColor: "#1FA855", borderRadius: skin.radius }]}>
            <Ionicons name="logo-whatsapp" size={17} color="#FFF" />
            <Text style={styles.halfText}>واتساب</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={call} style={[styles.half, { backgroundColor: brand, borderRadius: skin.radius }]}>
            <Ionicons name="call" size={16} color="#FFF" />
            <Text style={styles.halfText}>اتصال</Text>
          </Pressable>
        </View>
        <View style={[styles.card, { backgroundColor: skin.card, borderRadius: skin.radius }]}>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={16} color={brand} />
            <Text style={[styles.rowName, { color: skin.text, flex: 1 }]}>{project.address}</Text>
          </View>
          {project.instagram ? (
            <>
              <Divider skin={skin} />
              <View style={styles.row}>
                <Ionicons name="logo-instagram" size={16} color={brand} />
                <Text style={[styles.rowName, { color: skin.text, flex: 1 }]}>{`@${project.instagram}`}</Text>
              </View>
            </>
          ) : null}
        </View>
      </View>

      <Text style={[styles.signature, { color: skin.muted }]}>صُنع بـ واجهة</Text>
    </>
  );
}

/* ========================= الصدر والتبويب ========================= */

/**
 * صدرُ التطبيق — ستّة أشكال.
 *
 * وهو أوّل ما تقع عليه العين، وعليه وحده يُحكم أنّ هذين تطبيقان أم واحدٌ
 * صُبغ مرّتين. فالمطعمُ لافتةٌ تعلوها صفحة، والمتجرُ شريطُ بحث، والعيادةُ
 * بياضٌ رسميّ تحته شريطُ حقائق، والمنصّةُ ليلٌ فيه تحيّةٌ وما تركتَه، والصالونُ
 * قوس، والمواعيدُ غلافٌ يتوسّطه الاسم.
 */
function Header({ skin, brand, project }: { skin: Template["skin"]; brand: string; project: Project }) {
  const mark = monogram(project.name);

  if (skin.header === "shop") {
    return (
      <View style={[styles.shopHead, { backgroundColor: skin.card }]}>
        <View style={styles.shopTop}>
          <View style={[styles.shopMark, { backgroundColor: `${brand}14`, borderRadius: skin.radius - 4 }]}>
            <Text style={[styles.shopMarkText, { color: brand }]}>{mark}</Text>
          </View>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={[styles.shopName, { color: skin.text }]} numberOfLines={1}>{project.name}</Text>
            <Text style={[styles.shopTag, { color: skin.muted }]} numberOfLines={1}>{project.tagline}</Text>
          </View>
          <Ionicons name="heart-outline" size={20} color={skin.muted} />
        </View>
        <View style={[styles.search, { backgroundColor: skin.paper, borderColor: `${skin.muted}2A`, borderRadius: skin.radius - 2 }]}>
          <Ionicons name="search" size={15} color={skin.muted} />
          <Text style={[styles.searchText, { color: skin.muted }]}>ابحث في المتجر…</Text>
        </View>
        {skin.strap ? (
          <View style={[styles.ribbon, { backgroundColor: `${brand}12` }]}>
            <Ionicons name="bicycle-outline" size={14} color={brand} />
            <Text style={[styles.ribbonText, { color: brand }]}>{skin.strap}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  if (skin.header === "split") {
    return (
      <View>
        <View style={[styles.headPlain, { backgroundColor: skin.card }]}>
          <View style={[styles.mark, { backgroundColor: brand, borderRadius: skin.radius }]}>
            <Text style={styles.markText}>{mark}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headName, { color: skin.text }]}>{project.name}</Text>
            <Text style={[styles.headTag, { color: skin.muted }]}>{project.tagline}</Text>
          </View>
          <View style={[styles.callDot, { backgroundColor: `${brand}14` }]}>
            <Ionicons name="call" size={16} color={brand} />
          </View>
        </View>
        <View style={[styles.factStrip, { backgroundColor: brand }]}>
          {(skin.facts ?? []).map((fact, index) => (
            <Fragment key={fact}>
              {index > 0 ? <View style={styles.factDot} /> : null}
              <Text style={styles.factText}>{fact}</Text>
            </Fragment>
          ))}
        </View>
      </View>
    );
  }

  if (skin.header === "dark") {
    const course = project.courses.find((entry) => entry.done > 0 && entry.done < entry.lessons);
    const ratio = course && course.lessons > 0 ? course.done / course.lessons : 0;
    return (
      <View style={[styles.darkHead, { backgroundColor: skin.brandDeep }]}>
        <View style={styles.darkTop}>
          <View style={{ flex: 1 }}>
            {skin.strap ? <Text style={styles.darkStrap}>{skin.strap}</Text> : null}
            <Text style={styles.headNameOnDark}>{project.name}</Text>
          </View>
          <View style={[styles.mark, styles.markOnDark, { borderRadius: 99 }]}>
            <Text style={styles.markText}>{mark}</Text>
          </View>
        </View>
        {course ? (
          <View style={styles.resume}>
            <View style={styles.resumeTop}>
              <Ionicons name="play-circle" size={18} color="#FFF" />
              <Text style={styles.resumeName} numberOfLines={1}>{`أكمل: ${course.name}`}</Text>
            </View>
            <View style={styles.resumeTrack}>
              <View style={[styles.resumeFill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: "#FFFFFF" }]} />
            </View>
            <Text style={styles.resumeNote}>
              {`${arabicDigits(course.done)} من ${arabicDigits(course.lessons)} درسًا`}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  if (skin.header === "arch") {
    return (
      <LinearGradient
        colors={[brand, skin.brandDeep]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.archHead}
      >
        <View style={[styles.archMark, { borderColor: "rgba(255,255,255,0.55)" }]}>
          <Text style={styles.archMarkText}>{mark}</Text>
        </View>
        <Text style={styles.archName}>{project.name}</Text>
        <Text style={styles.archTag}>{project.tagline}</Text>
        {skin.strap ? <Text style={styles.archStrap}>{skin.strap}</Text> : null}
      </LinearGradient>
    );
  }

  if (skin.header === "band") {
    return (
      <LinearGradient
        colors={[brand, skin.brandDeep]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bandHead}
      >
        <View style={styles.headArt} pointerEvents="none">
          <View style={[styles.arc, { width: 210, height: 210, top: -90, start: -60 }]} />
          <View style={[styles.arc, { width: 130, height: 130, top: 4, start: 280 }]} />
        </View>
        <View style={styles.bandRow}>
          <View style={[styles.mark, styles.markOnDark, { borderRadius: skin.radius }]}>
            <Text style={styles.markText}>{mark}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bandName}>{project.name}</Text>
            <Text style={styles.headTagOnDark}>{project.tagline}</Text>
          </View>
        </View>
        {skin.strap ? (
          <View style={styles.bandStrap}>
            <Ionicons name="time-outline" size={14} color="#FFF" />
            <Text style={styles.bandStrapText}>{skin.strap}</Text>
          </View>
        ) : null}
      </LinearGradient>
    );
  }

  // cover
  return (
    <LinearGradient
      colors={[brand, skin.brandDeep]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.coverHead}
    >
      <View style={styles.headArt} pointerEvents="none">
        <View style={[styles.arc, { width: 240, height: 240, top: -120, start: -70 }]} />
        <View style={[styles.arc, { width: 150, height: 150, top: 40, start: 290 }]} />
      </View>
      <View style={[styles.coverMark, { borderRadius: skin.radius + 8 }]}>
        <Text style={styles.coverMarkText}>{mark}</Text>
      </View>
      <Text style={styles.coverName}>{project.name}</Text>
      <Text style={styles.headTagOnDark}>{project.tagline}</Text>
      {skin.facts && skin.facts.length > 0 ? (
        <View style={styles.chips}>
          {skin.facts.map((fact) => (
            <View key={fact} style={styles.chip}>
              <Text style={styles.chipText}>{fact}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </LinearGradient>
  );
}

/**
 * شريطُ التبويب — ثلاثة أشكال.
 *
 * والقرصُ العائم يقول «تطبيقٌ حديث»، والشريطُ المسطّح يقول «رسميّ»،
 * والمستديرُ الأعلى يقول «هادئ». وهذه لغةٌ يقرؤها الزبون بلا أن يسمّيها.
 */
function Nav({
  skin, brand, tabs, tab, setTab, count,
}: {
  skin: Template["skin"];
  brand: string;
  tabs: { key: string; label: string; icon: string }[];
  tab: number;
  setTab: (next: number) => void;
  count: number;
}) {
  const items = tabs.map((entry, index) => {
    const on = index === tab;
    const badge = entry.key === "cart" && count > 0 ? count : 0;
    return (
      <Pressable
        key={entry.key}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        onPress={() => setTab(index)}
        style={styles.tab}
      >
        <View
          style={[
            styles.tabIcon,
            skin.nav === "soft" && on ? { backgroundColor: `${brand}16`, borderRadius: 999 } : null,
          ]}
        >
          <Ionicons
            name={entry.icon as keyof typeof Ionicons.glyphMap}
            size={20}
            color={on ? brand : skin.muted}
          />
          {badge > 0 ? (
            <View style={[styles.badge, { backgroundColor: brand }]}>
              <Text style={styles.badgeText}>{arabicDigits(badge)}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.tabLabel, { color: on ? brand : skin.muted }]}>{entry.label}</Text>
      </Pressable>
    );
  });

  if (skin.nav === "pill") {
    return (
      <View style={[styles.navPill, { backgroundColor: skin.card }]} pointerEvents="box-none">
        {items}
      </View>
    );
  }

  if (skin.nav === "soft") {
    return <View style={[styles.navSoft, { backgroundColor: skin.card }]}>{items}</View>;
  }

  return (
    <View style={[styles.tabs, { backgroundColor: skin.card, borderTopColor: `${skin.muted}22` }]}>{items}</View>
  );
}

/* ========================= لبنات مشتركة ========================= */

function Title({ text, skin, brand }: { text: string; skin: Template["skin"]; brand: string }) {
  return (
    <View style={styles.titleRow}>
      <View style={[styles.tick, { backgroundColor: brand }]} />
      <Text style={[styles.title, { color: skin.text }]}>{text}</Text>
    </View>
  );
}

/**
 * سطرا العنوان والوقت.
 *
 * ويُوضعان أسفل الشاشة التي تنتهي قبل أن تمتلئ — والفراغُ في أسفل الشاشة
 * يُقرأ «ناقص»، وهذان سطران يملآنه بما يُسأل عنه فعلًا: أين أنتم، ومتى.
 */
function MiniInfo({ skin, brand, project }: Common) {
  const hours = project.hours[0];
  return (
    <View style={[styles.card, { backgroundColor: skin.card, borderRadius: skin.radius }]}>
      <View style={styles.miniInfo}>
        <Ionicons name="location-outline" size={16} color={brand} />
        <Text style={[styles.rowName, { color: skin.text, flex: 1 }]}>{project.address}</Text>
      </View>
      {hours ? (
        <>
          <Divider skin={skin} />
          <View style={styles.miniInfo}>
            <Ionicons name="time-outline" size={16} color={brand} />
            <Text style={[styles.rowName, { color: skin.text, flex: 1 }]}>{hours.days}</Text>
            <Text style={[styles.rowNote, { color: skin.muted }]}>{hours.hours}</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

function Divider({ skin }: { skin: Template["skin"] }) {
  return <View style={[styles.divider, { backgroundColor: `${skin.muted}22` }]} />;
}

function Stepper({
  qty, onAdd, brand, enabled,
}: { qty: number; onAdd: (by: number) => void; brand: string; enabled: boolean }) {
  if (qty === 0) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="أضف"
        onPress={() => enabled && onAdd(1)}
        style={[styles.plus, { backgroundColor: `${brand}14` }]}
      >
        <Ionicons name="add" size={17} color={brand} />
      </Pressable>
    );
  }
  return (
    <View style={[styles.stepper, { backgroundColor: `${brand}14` }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="أنقص" onPress={() => enabled && onAdd(-1)} hitSlop={6}>
        <Ionicons name="remove" size={15} color={brand} />
      </Pressable>
      <Text style={[styles.qty, { color: brand }]}>{arabicDigits(qty)}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="زد" onPress={() => enabled && onAdd(1)} hitSlop={6}>
        <Ionicons name="add" size={15} color={brand} />
      </Pressable>
    </View>
  );
}

function Big({
  label, icon, onPress, color, radius,
}: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; color: string; radius: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.big, { backgroundColor: color, borderRadius: radius }]}
    >
      <Ionicons name={icon} size={18} color="#FFF" />
      <Text style={styles.bigText}>{label}</Text>
    </Pressable>
  );
}

/** يجمع العروض بأقسامها؛ وما لا قسم له يقع تحت اسم القائمة نفسه. */
function groupBy(offers: Offer[], fallback: string): Record<string, Offer[]> {
  return offers.reduce<Record<string, Offer[]>>((map, offer) => {
    const key = offer.category ?? fallback;
    (map[key] ||= []).push(offer);
    return map;
  }, {});
}

const styles = StyleSheet.create({
  app: { flex: 1 },

  headArt: { ...StyleSheet.absoluteFillObject },
  arc: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)" },
  headPlain: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingTop: 52, paddingBottom: 16 },

  /* — غلاف: الاسم في الوسط وتحته شارات — */
  coverHead: { paddingHorizontal: 18, paddingTop: 54, paddingBottom: 20, alignItems: "center", gap: 5, overflow: "hidden" },
  coverMark: {
    width: 56, height: 56, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
  },
  coverMarkText: { fontFamily: "Tajawal_700Bold", fontSize: 21, color: "#FFFFFF" },
  coverName: { fontFamily: "Tajawal_700Bold", fontSize: 21, color: "#FFFFFF", marginTop: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 10 },
  chip: { backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontFamily: "Tajawal_500Medium", fontSize: 10.5, color: "#FFFFFF" },

  /* — لافتة: تعلوها صفحةٌ مستديرة الطرفين — */
  bandHead: { paddingHorizontal: 18, paddingTop: 50, paddingBottom: 34, gap: 12, overflow: "hidden" },
  bandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  bandName: { fontFamily: "Tajawal_700Bold", fontSize: 21, color: "#FFFFFF" },
  bandStrap: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.22)", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5,
  },
  bandStrapText: { fontFamily: "Tajawal_500Medium", fontSize: 11, color: "#FFFFFF" },

  /* — متجر: بحثٌ وشريطُ شحن — */
  shopHead: { paddingHorizontal: 16, paddingTop: 50, paddingBottom: 0, gap: 10 },
  shopTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  shopMark: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  shopMarkText: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  shopName: { fontFamily: "Tajawal_700Bold", fontSize: 16.5 },
  shopTag: { fontFamily: "Tajawal_400Regular", fontSize: 10.5 },
  search: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  searchText: { fontFamily: "Tajawal_400Regular", fontSize: 12.5 },
  ribbon: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    marginHorizontal: -16, paddingVertical: 7,
  },
  ribbonText: { fontFamily: "Tajawal_500Medium", fontSize: 11 },

  /* — عيادة: بياضٌ رسميّ وتحته شريطُ حقائق — */
  callDot: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  factStrip: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  factText: { fontFamily: "Tajawal_500Medium", fontSize: 10.5, color: "#FFFFFF" },
  factDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.55)" },

  /* — منصّة: ليلٌ فيه تحيّةٌ وما تركتَه — */
  darkHead: { paddingHorizontal: 18, paddingTop: 50, paddingBottom: 18, gap: 14 },
  darkTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  darkStrap: { fontFamily: "Tajawal_400Regular", fontSize: 11.5, color: "rgba(255,255,255,0.62)", marginBottom: 2 },
  resume: { backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 16, padding: 12, gap: 8 },
  resumeTop: { flexDirection: "row", alignItems: "center", gap: 7 },
  resumeName: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: "#FFFFFF", flex: 1 },
  resumeTrack: { height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden" },
  resumeFill: { height: 5, borderRadius: 3 },
  miniInfo: { flexDirection: "row", alignItems: "center", gap: 9, padding: 12 },
  resumeNote: { fontFamily: "Tajawal_400Regular", fontSize: 10.5, color: "rgba(255,255,255,0.7)" },

  /* — صالون: قوسٌ مستديرُ الطرفين — */
  archHead: {
    paddingHorizontal: 18, paddingTop: 52, paddingBottom: 26, alignItems: "center", gap: 4,
    borderBottomStartRadius: 34, borderBottomEndRadius: 34,
  },
  archMark: {
    width: 50, height: 50, borderRadius: 25, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  archMarkText: { fontFamily: "Tajawal_700Bold", fontSize: 18, color: "#FFFFFF" },
  archName: { fontFamily: "Tajawal_700Bold", fontSize: 20, color: "#FFFFFF", letterSpacing: 1.2 },
  archTag: { fontFamily: "Tajawal_400Regular", fontSize: 11.5, color: "rgba(255,255,255,0.82)" },
  archStrap: { fontFamily: "Tajawal_400Regular", fontSize: 10.5, color: "rgba(255,255,255,0.62)", letterSpacing: 1.6, marginTop: 6 },
  mark: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  markOnDark: { backgroundColor: "rgba(255,255,255,0.18)" },
  markText: { fontFamily: "Tajawal_700Bold", fontSize: 17, color: "#FFFFFF" },
  headName: { fontFamily: "Tajawal_700Bold", fontSize: 19 },
  headTag: { fontFamily: "Tajawal_400Regular", fontSize: 12 },
  headNameOnDark: { fontFamily: "Tajawal_700Bold", fontSize: 19, color: "#FFFFFF" },
  headTagOnDark: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: "rgba(255,255,255,0.8)" },

  body: { flex: 1 },
  bodyPad: { padding: 16, paddingBottom: 28, gap: 18 },
  bodyPadFloating: { paddingBottom: 96 },
  block: { gap: 9 },

  titleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  tick: { width: 4, height: 15, borderRadius: 2 },
  title: { fontFamily: "Tajawal_700Bold", fontSize: 15.5 },

  card: { paddingHorizontal: 13, paddingVertical: 3 },
  divider: { height: StyleSheet.hairlineWidth },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11 },
  rowName: { fontFamily: "Tajawal_500Medium", fontSize: 14 },
  rowNote: { fontFamily: "Tajawal_400Regular", fontSize: 11.5 },
  price: { fontFamily: "Tajawal_700Bold", fontSize: 13.5 },
  totalLabel: { fontFamily: "Tajawal_700Bold", fontSize: 15, flex: 1 },
  totalValue: { fontFamily: "Tajawal_700Bold", fontSize: 17 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: (390 - 32 - 10) / 2, padding: 10, gap: 6 },
  tileArt: { height: 74, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  tileTag: { position: "absolute", top: 6, start: 6, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  tileTagText: { fontFamily: "Tajawal_500Medium", fontSize: 8.5, color: "#FFFFFF" },
  tileName: { fontFamily: "Tajawal_500Medium", fontSize: 13 },
  tileNote: { fontFamily: "Tajawal_400Regular", fontSize: 10.5 },
  dish: { flexDirection: "row", alignItems: "center", gap: 11, padding: 10 },
  dishArt: { width: 54, height: 54, alignItems: "center", justifyContent: "center" },
  tileFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  plus: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  qty: { fontFamily: "Tajawal_700Bold", fontSize: 13, minWidth: 14, textAlign: "center" },

  peopleRow: { flexDirection: "row", gap: 9 },
  person: { width: 92, padding: 10, alignItems: "center", gap: 4, borderWidth: 1.5 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  personName: { fontFamily: "Tajawal_500Medium", fontSize: 12.5 },
  personRole: { fontFamily: "Tajawal_400Regular", fontSize: 10.5 },

  daysRow: { flexDirection: "row", gap: 8 },
  day: { width: 62, paddingVertical: 10, alignItems: "center", gap: 2 },
  dayName: { fontFamily: "Tajawal_400Regular", fontSize: 11 },
  dayDate: { fontFamily: "Tajawal_700Bold", fontSize: 16 },

  slots: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slot: { width: (390 - 32 - 24) / 4, paddingVertical: 10, alignItems: "center", borderWidth: 1 },
  slotText: { fontFamily: "Tajawal_500Medium", fontSize: 13 },

  big: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, marginTop: 4 },
  bigText: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: "#FFFFFF" },
  hint: { fontFamily: "Tajawal_400Regular", fontSize: 11, textAlign: "center", lineHeight: 18 },

  bookingCard: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 13, paddingHorizontal: 13, overflow: "hidden" },
  bookingTick: { width: 4, height: 34, borderRadius: 2 },
  state: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  stateText: { fontFamily: "Tajawal_500Medium", fontSize: 11 },

  docCard: {
    flexDirection: "row", alignItems: "center", gap: 11,
    padding: 12, borderWidth: 1.5,
  },
  docAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  docAvatarText: { fontFamily: "Tajawal_700Bold", fontSize: 19 },
  docRole: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  docRoleText: { fontFamily: "Tajawal_500Medium", fontSize: 10.5 },
  docNext: { flexDirection: "row", alignItems: "center", gap: 4 },
  docBook: { paddingHorizontal: 12, paddingVertical: 7 },
  docBookText: { fontFamily: "Tajawal_700Bold", fontSize: 12 },

  courseWrap: { overflow: "hidden" },
  courseCover: { height: 70, alignItems: "center", justifyContent: "center", gap: 3 },
  courseLessons: { fontFamily: "Tajawal_500Medium", fontSize: 10.5, color: "rgba(255,255,255,0.85)" },
  courseBody: { padding: 12, gap: 3 },
  courseFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  courseGo: { paddingHorizontal: 12, paddingVertical: 6 },
  courseGoText: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  courseHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3 },

  about: { fontFamily: "Tajawal_400Regular", fontSize: 13.5, lineHeight: 23 },
  pair: { flexDirection: "row", gap: 9 },
  half: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  halfText: { fontFamily: "Tajawal_500Medium", fontSize: 13.5, color: "#FFFFFF" },
  signature: { fontFamily: "Tajawal_400Regular", fontSize: 11, textAlign: "center", letterSpacing: 0.4, marginTop: 6 },

  empty: { alignItems: "center", gap: 9, paddingVertical: 54 },
  emptyText: { fontFamily: "Tajawal_400Regular", fontSize: 13.5 },

  tabs: { flexDirection: "row", paddingTop: 8, paddingBottom: 22, borderTopWidth: StyleSheet.hairlineWidth },
  navPill: {
    position: "absolute", bottom: 20, start: 16, end: 16,
    flexDirection: "row", borderRadius: 999, paddingVertical: 11,
    shadowColor: "#0A140F", shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  navSoft: {
    flexDirection: "row", paddingTop: 12, paddingBottom: 22,
    borderTopStartRadius: 24, borderTopEndRadius: 24,
    shadowColor: "#0A140F", shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: -4 }, elevation: 8,
  },
  tab: { flex: 1, alignItems: "center", gap: 3 },
  tabIcon: { paddingHorizontal: 14, paddingVertical: 3 },
  tabLabel: { fontFamily: "Tajawal_500Medium", fontSize: 10.5 },
  badge: {
    position: "absolute", top: -5, start: -8, minWidth: 15, height: 15, borderRadius: 8,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  badgeText: { fontFamily: "Tajawal_700Bold", fontSize: 9.5, color: "#FFFFFF" },
});
