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
      {/* ——— الصدر ——— */}
      {skin.hero === "plain" ? (
        <View style={[styles.headPlain, { backgroundColor: skin.card, borderBottomColor: `${skin.muted}22` }]}>
          <View style={[styles.mark, { backgroundColor: brand, borderRadius: skin.radius }]}>
            <Text style={styles.markText}>{monogram(project.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headName, { color: skin.text }]}>{project.name}</Text>
            <Text style={[styles.headTag, { color: skin.muted }]}>{project.tagline}</Text>
          </View>
        </View>
      ) : (
        <LinearGradient
          colors={[brand, skin.brandDeep]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.head}
        >
          <View style={styles.headArt} pointerEvents="none">
            <View style={[styles.arc, { width: 190, height: 190, top: -80, start: -50 }]} />
            <View style={[styles.arc, { width: 120, height: 120, top: 10, start: 270 }]} />
          </View>
          <View style={[styles.mark, styles.markOnDark, { borderRadius: skin.radius }]}>
            <Text style={styles.markText}>{monogram(project.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headNameOnDark}>{project.name}</Text>
            <Text style={styles.headTagOnDark}>{project.tagline}</Text>
          </View>
        </LinearGradient>
      )}

      {/* ——— الجسم ——— */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyPad}
        showsVerticalScrollIndicator={false}
        scrollEnabled={interactive}
      >
        {project.kind === "restaurant" || project.kind === "store" ? (
          tab === 0 ? (
            <Catalogue {...P} grid={project.kind === "store"} cart={cart} add={add} label={meta.offerLabel} />
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

      {/* ——— شريط التبويب ——— */}
      <View style={[styles.tabs, { backgroundColor: skin.card, borderTopColor: `${skin.muted}22` }]}>
        {meta.tabs.map((entry, index) => {
          const on = index === tab;
          const badge = entry.key === "cart" && count > 0 ? count : 0;
          return (
            <Pressable
              key={entry.key}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => interactive && setTab(index)}
              style={styles.tab}
            >
              <View>
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
        })}
      </View>
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

/** قائمةُ مطعمٍ أو رفوفُ متجر — والفرق شبكةٌ أو قائمة. */
function Catalogue({
  skin, brand, project, interactive, grid, cart, add, label,
}: Common & {
  grid: boolean;
  cart: Record<string, number>;
  add: (id: string, by: number) => void;
  label: string;
}) {
  const groups = groupBy(project.offers, label);
  return (
    <>
      {Object.entries(groups).map(([category, items]) => (
        <View key={category} style={styles.block}>
          <Title text={category} skin={skin} brand={brand} />
          {grid ? (
            <View style={styles.grid}>
              {items.map((offer) => (
                <View key={offer.id} style={[styles.tile, { backgroundColor: skin.card, borderRadius: skin.radius }]}>
                  <View style={[styles.tileArt, { backgroundColor: `${brand}12`, borderRadius: skin.radius - 4 }]}>
                    <Ionicons name="cube-outline" size={24} color={`${brand}99`} />
                  </View>
                  <Text style={[styles.tileName, { color: skin.text }]} numberOfLines={1}>{offer.name}</Text>
                  <View style={styles.tileFoot}>
                    <Text style={[styles.price, { color: brand }]}>{omr(offer.price)}</Text>
                    <Stepper qty={cart[offer.id] ?? 0} onAdd={(by) => add(offer.id, by)} brand={brand} enabled={interactive} />
                  </View>
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
function Services({ skin, brand, project, label }: Common & { label: string }) {
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

/** فريقٌ أو أطبّاء — والفرق سطرُ «أقرب موعد». */
function Team({
  skin, brand, project, interactive, pick, setPick, doctors,
}: Common & { pick: number; setPick: (value: number) => void; doctors?: boolean }) {
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

/** الدورات — والسعرُ ظاهرٌ وعددُ الدروس، فلا يُشترى مجهول. */
function Courses({ skin, brand, project }: Common) {
  return (
    <View style={styles.block}>
      <Title text="الدورات" skin={skin} brand={brand} />
      {project.courses.map((course) => (
        <View key={course.id} style={[styles.card, styles.courseCard, { backgroundColor: skin.card, borderRadius: skin.radius }]}>
          <View style={[styles.courseArt, { backgroundColor: `${brand}14`, borderRadius: skin.radius - 4 }]}>
            <Ionicons name="play" size={20} color={brand} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.rowName, { color: skin.text }]}>{course.name}</Text>
            <Text style={[styles.rowNote, { color: skin.muted }]}>
              {`${course.teacher} · ${arabicDigits(course.lessons)} درسًا`}
            </Text>
          </View>
          <Text style={[styles.price, { color: brand }]}>{omr(course.price)}</Text>
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

/* ========================= لبنات مشتركة ========================= */

function Title({ text, skin, brand }: { text: string; skin: Template["skin"]; brand: string }) {
  return (
    <View style={styles.titleRow}>
      <View style={[styles.tick, { backgroundColor: brand }]} />
      <Text style={[styles.title, { color: skin.text }]}>{text}</Text>
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

  head: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingTop: 52, paddingBottom: 18, overflow: "hidden" },
  headArt: { ...StyleSheet.absoluteFillObject },
  arc: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)" },
  headPlain: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingTop: 52, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  mark: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  markOnDark: { backgroundColor: "rgba(255,255,255,0.18)" },
  markText: { fontFamily: "Tajawal_700Bold", fontSize: 17, color: "#FFFFFF" },
  headName: { fontFamily: "Tajawal_700Bold", fontSize: 19 },
  headTag: { fontFamily: "Tajawal_400Regular", fontSize: 12 },
  headNameOnDark: { fontFamily: "Tajawal_700Bold", fontSize: 19, color: "#FFFFFF" },
  headTagOnDark: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: "rgba(255,255,255,0.8)" },

  body: { flex: 1 },
  bodyPad: { padding: 16, paddingBottom: 28, gap: 18 },
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
  tileArt: { height: 74, alignItems: "center", justifyContent: "center" },
  tileName: { fontFamily: "Tajawal_500Medium", fontSize: 13 },
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

  courseCard: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 12, paddingHorizontal: 12 },
  courseArt: { width: 46, height: 46, alignItems: "center", justifyContent: "center" },
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
  tab: { flex: 1, alignItems: "center", gap: 3 },
  tabLabel: { fontFamily: "Tajawal_500Medium", fontSize: 10.5 },
  badge: {
    position: "absolute", top: -5, start: -8, minWidth: 15, height: 15, borderRadius: 8,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  badgeText: { fontFamily: "Tajawal_700Bold", fontSize: 9.5, color: "#FFFFFF" },
});
