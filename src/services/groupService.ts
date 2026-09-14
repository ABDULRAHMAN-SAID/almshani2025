import type { DiscussionGroup, GroupPost, MediaAttachment } from "@/types/models";
import { USE_MOCK_DATA } from "./config";
import { supabase } from "./supabase";

/**
 * المجموعات النقاشية المُدارة.
 *
 * الحدود المقصودة، وهي جزء من التصميم لا تفصيل واجهة:
 * - لا توجد رسائل خاصة بين المستخدمين ولا قائمة أعضاء ولا أرقام هواتف؛
 *   المجموعة لوحة نقاش عامة حول موضوع نشاط، والاسم فقط هو ما يظهر.
 * - المجموعة تُنشئها الإدارة وحدها، وتستطيع قفلها أو حذف أي مشاركة.
 * - كل مشاركة قابلة للإبلاغ، والبلاغات تظهر للإدارة فقط.
 */

const today = () => new Date().toISOString().slice(0, 10);

const mockGroups: DiscussionGroup[] = [
  {
    id: "grp-1",
    title: "تنظيم البطولة الرياضية",
    topic: "الأنشطة الرياضية",
    description:
      "مساحة لتنسيق المشاركة في البطولة: تشكيل الفرق، مواعيد التمارين، والاقتراحات التنظيمية.",
    audience: "all",
    locked: false,
    postCount: 2,
    createdAt: today(),
  },
  {
    id: "grp-2",
    title: "نادي القراءة",
    topic: "ثقافي",
    description: "نقاش شهري حول كتاب مختار، وتبادل الترشيحات والملخّصات.",
    audience: "all",
    locked: false,
    postCount: 1,
    createdAt: today(),
  },
  {
    id: "grp-3",
    title: "ملاحظات السلامة المرورية",
    topic: "توعية",
    description: "نقاش عام حول السلامة المرورية داخل المجمّع السكني وفي الطريق العام.",
    audience: "all",
    locked: true,
    postCount: 1,
    createdAt: today(),
  },
];

const mockPosts: GroupPost[] = [
  {
    id: "post-1",
    groupId: "grp-1",
    authorId: "u-2",
    authorName: "خالد بن ناصر",
    body: "أقترح أن يكون التمرين المشترك يوم الثلاثاء بعد العصر، فهو الأنسب لأغلب المشاركين.",
    attachments: [],
    pinned: true,
    reportCount: 0,
    createdAt: today(),
  },
  {
    id: "post-2",
    groupId: "grp-1",
    authorId: "me",
    authorName: "سالم بن عبدالله",
    body: "موافق. من يرغب في الانضمام لفريق كرة الطائرة يكتب اسمه هنا حتى نكمل العدد.",
    attachments: [],
    pinned: false,
    reportCount: 0,
    createdAt: today(),
  },
  {
    id: "post-3",
    groupId: "grp-2",
    authorId: "u-3",
    authorName: "أحمد بن سعيد",
    body: "ترشيحي لكتاب هذا الشهر: «عمان في التاريخ». مناسب للنقاش ويسهل الحصول عليه من المكتبة.",
    attachments: [],
    pinned: false,
    reportCount: 0,
    createdAt: today(),
  },
  {
    id: "post-4",
    groupId: "grp-3",
    authorId: "u-4",
    authorName: "منذر بن حمد",
    body: "تذكير: الالتزام بالسرعة داخل المجمّع 30 كم/س، وخاصة قرب مواقف الحافلات صباحًا.",
    attachments: [],
    pinned: true,
    reportCount: 0,
    createdAt: today(),
  },
];

const toGroup = (row: Record<string, unknown>): DiscussionGroup => ({
  id: String(row.id),
  title: String(row.title ?? ""),
  topic: String(row.topic ?? ""),
  description: String(row.description ?? ""),
  coverImage: (row.cover_image as string) ?? undefined,
  audience: (row.audience as DiscussionGroup["audience"]) ?? "all",
  activityId: (row.activity_id as string) ?? undefined,
  locked: Boolean(row.locked),
  postCount: Number(row.post_count ?? 0),
  createdAt: String(row.created_at ?? "").slice(0, 10),
});

const toPost = (row: Record<string, unknown>): GroupPost => ({
  id: String(row.id),
  groupId: String(row.group_id),
  authorId: String(row.author_id),
  authorName: String(row.author_name ?? ""),
  body: String(row.body ?? ""),
  attachments: (row.attachments as MediaAttachment[]) ?? [],
  pinned: Boolean(row.pinned),
  reportCount: Number(row.report_count ?? 0),
  createdAt: String(row.created_at ?? "").slice(0, 10),
});

/* ============ المجموعات ============ */

export async function fetchGroups(): Promise<DiscussionGroup[]> {
  if (USE_MOCK_DATA) return [...mockGroups];
  const { data, error } = await supabase
    .from("discussion_groups")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data as Record<string, unknown>[]) ?? []).map(toGroup);
}

export async function fetchGroup(id: string): Promise<DiscussionGroup | null> {
  if (USE_MOCK_DATA) return mockGroups.find((group) => group.id === id) ?? null;
  const { data, error } = await supabase.from("discussion_groups").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toGroup(data as Record<string, unknown>) : null;
}

export type GroupInput = Omit<DiscussionGroup, "id" | "postCount" | "createdAt">;

export async function createGroup(input: GroupInput): Promise<DiscussionGroup> {
  const group: DiscussionGroup = {
    ...input,
    id: `grp-${Date.now()}`,
    postCount: 0,
    createdAt: today(),
  };

  if (!USE_MOCK_DATA) {
    const { data, error } = await supabase
      .from("discussion_groups")
      .insert({
        title: input.title,
        topic: input.topic,
        description: input.description,
        cover_image: input.coverImage || null,
        audience: input.audience,
        activity_id: input.activityId || null,
        locked: input.locked,
      })
      .select()
      .single();
    if (error) throw error;
    return toGroup(data as Record<string, unknown>);
  }

  mockGroups.unshift(group);
  return group;
}

export async function updateGroup(id: string, patch: Partial<GroupInput>): Promise<void> {
  if (!USE_MOCK_DATA) {
    const { error } = await supabase
      .from("discussion_groups")
      .update({
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.topic !== undefined && { topic: patch.topic }),
        ...(patch.description !== undefined && { description: patch.description }),
        ...(patch.coverImage !== undefined && { cover_image: patch.coverImage || null }),
        ...(patch.audience !== undefined && { audience: patch.audience }),
        ...(patch.activityId !== undefined && { activity_id: patch.activityId || null }),
        ...(patch.locked !== undefined && { locked: patch.locked }),
      })
      .eq("id", id);
    if (error) throw error;
    return;
  }
  const group = mockGroups.find((item) => item.id === id);
  if (group) Object.assign(group, patch);
}

export async function deleteGroup(id: string): Promise<void> {
  if (!USE_MOCK_DATA) {
    const { error } = await supabase.from("discussion_groups").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  const index = mockGroups.findIndex((item) => item.id === id);
  if (index >= 0) mockGroups.splice(index, 1);
  for (let i = mockPosts.length - 1; i >= 0; i -= 1) {
    if (mockPosts[i].groupId === id) mockPosts.splice(i, 1);
  }
}

/* ============ المشاركات ============ */

/** المثبَّت أولًا ثم الأحدث. */
const orderPosts = (posts: GroupPost[]) =>
  [...posts].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);
  });

export async function fetchPosts(groupId: string): Promise<GroupPost[]> {
  if (USE_MOCK_DATA) {
    return orderPosts(mockPosts.filter((post) => post.groupId === groupId));
  }
  const { data, error } = await supabase
    .from("group_posts")
    .select("*")
    .eq("group_id", groupId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data as Record<string, unknown>[]) ?? []).map(toPost);
}

interface NewPostInput {
  groupId: string;
  authorId: string;
  authorName: string;
  body: string;
  attachments: MediaAttachment[];
}

export async function createPost(input: NewPostInput): Promise<GroupPost> {
  const post: GroupPost = {
    ...input,
    id: `post-${Date.now()}`,
    pinned: false,
    reportCount: 0,
    createdAt: today(),
  };

  if (!USE_MOCK_DATA) {
    const { data, error } = await supabase
      .from("group_posts")
      .insert({
        group_id: input.groupId,
        author_id: input.authorId,
        author_name: input.authorName,
        body: input.body,
        attachments: input.attachments,
      })
      .select()
      .single();
    if (error) throw error;
    return toPost(data as Record<string, unknown>);
  }

  mockPosts.push(post);
  const group = mockGroups.find((item) => item.id === input.groupId);
  if (group) group.postCount += 1;
  return post;
}

/** يحذف المستخدم مشاركته، وتحذف الإدارة أي مشاركة (تفرضه سياسة RLS). */
export async function deletePost(id: string): Promise<void> {
  if (!USE_MOCK_DATA) {
    const { error } = await supabase.from("group_posts").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  const index = mockPosts.findIndex((item) => item.id === id);
  if (index < 0) return;
  const [removed] = mockPosts.splice(index, 1);
  const group = mockGroups.find((item) => item.id === removed.groupId);
  if (group) group.postCount = Math.max(0, group.postCount - 1);
}

export async function setPostPinned(id: string, pinned: boolean): Promise<void> {
  if (!USE_MOCK_DATA) {
    const { error } = await supabase.from("group_posts").update({ pinned }).eq("id", id);
    if (error) throw error;
    return;
  }
  const post = mockPosts.find((item) => item.id === id);
  if (post) post.pinned = pinned;
}

/**
 * بلاغ عن مشاركة مخالفة. يمرّ على الخادم عبر دالة موثوقة تمنع تكرار البلاغ
 * من الشخص نفسه، فلا يستطيع أحد رفع عدّاد البلاغات على مشاركة لا تعجبه.
 */
export async function reportPost(id: string, reason: string): Promise<void> {
  if (!USE_MOCK_DATA) {
    const { error } = await supabase.rpc("report_group_post", { p_post_id: id, p_reason: reason });
    if (error) throw error;
    return;
  }
  const post = mockPosts.find((item) => item.id === id);
  if (post) post.reportCount += 1;
}
