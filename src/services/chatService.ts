import { USE_MOCK_DATA } from "./config";
import { supabase } from "./supabase";

/**
 * الأصدقاء والمحادثات الخاصة.
 *
 * كل ما هنا يمرّ بالخادم: القراءة محكومة بسياسات RLS تقصر كل محادثة على
 * أعضائها، والبدء والإضافة بدوالّ موثوقة تشترط الصداقة. فلا يُغني إخفاء زرّ
 * في الشاشة عن شيء، ولا يضرّ ظهوره.
 */

export interface Person {
  id: string;
  fullName: string;
}

export interface FriendRequest {
  id: string;
  userId: string;
  fullName: string;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  kind: "direct" | "group";
  title: string;
  image?: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  body: string;
  image?: string;
  createdAt: string;
}

/* ------------------------------ وضع العرض ------------------------------ */
/** ذاكرة النسخة التجريبية: تعمل بلا خادم ليُجرَّب الشكل، ولا تُحفظ. */
const mock = {
  friends: [
    { id: "mock-1", fullName: "سالم بن حمد" },
    { id: "mock-2", fullName: "خالد بن سيف" },
  ] as Person[],
  requests: [
    { id: "req-1", userId: "mock-3", fullName: "ناصر بن علي", createdAt: new Date().toISOString() },
  ] as FriendRequest[],
  conversations: [
    {
      id: "conv-1", kind: "direct" as const, title: "سالم بن حمد",
      lastMessage: "على الساعة ٤ إن شاء الله", lastMessageAt: new Date().toISOString(), unread: 2,
    },
    {
      id: "conv-2", kind: "group" as const, title: "مجموعة الرماية",
      lastMessage: "التدريب غدًا", lastMessageAt: new Date(Date.now() - 3_600_000).toISOString(), unread: 0,
    },
  ] as ConversationSummary[],
  messages: {
    "conv-1": [
      { id: "m1", conversationId: "conv-1", senderId: "mock-1", senderName: "سالم بن حمد", body: "السلام عليكم", createdAt: new Date(Date.now() - 7_200_000).toISOString() },
      { id: "m2", conversationId: "conv-1", senderId: "me", body: "وعليكم السلام", createdAt: new Date(Date.now() - 7_000_000).toISOString() },
      { id: "m3", conversationId: "conv-1", senderId: "mock-1", senderName: "سالم بن حمد", body: "على الساعة ٤ إن شاء الله", createdAt: new Date(Date.now() - 600_000).toISOString() },
    ],
    "conv-2": [
      { id: "m4", conversationId: "conv-2", senderId: "mock-2", senderName: "خالد بن سيف", body: "التدريب غدًا", createdAt: new Date(Date.now() - 3_600_000).toISOString() },
    ],
  } as Record<string, ChatMessage[]>,
};

/* ------------------------------- الأصدقاء ------------------------------- */

export async function searchMembers(query: string): Promise<Person[]> {
  if (query.trim().length < 3) return [];
  if (USE_MOCK_DATA) {
    return mock.friends.filter((person) => person.fullName.includes(query.trim()));
  }
  const { data, error } = await supabase.rpc("search_members", { p_query: query.trim() });
  if (error) throw error;
  return ((data ?? []) as { id: string; full_name: string }[]).map((row) => ({
    id: row.id,
    fullName: row.full_name,
  }));
}

export async function fetchFriends(): Promise<Person[]> {
  if (USE_MOCK_DATA) return [...mock.friends];
  const { data, error } = await supabase.rpc("my_friends");
  if (error) throw error;
  return ((data ?? []) as { id: string; full_name: string }[]).map((row) => ({
    id: row.id,
    fullName: row.full_name,
  }));
}

export async function fetchFriendRequests(): Promise<FriendRequest[]> {
  if (USE_MOCK_DATA) return [...mock.requests];
  const { data, error } = await supabase.rpc("my_friend_requests");
  if (error) throw error;
  return ((data ?? []) as { id: string; user_id: string; full_name: string; created_at: string }[]).map(
    (row) => ({ id: row.id, userId: row.user_id, fullName: row.full_name, createdAt: row.created_at })
  );
}

export async function sendFriendRequest(userId: string): Promise<void> {
  if (USE_MOCK_DATA) return;
  const { data: me } = await supabase.auth.getUser();
  const requester = me.user?.id;
  if (!requester) throw new Error("سجّل الدخول أولًا");
  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: requester, addressee_id: userId });
  // طلبٌ سبق إرساله ليس خطأً يُعرض: نكتفي بأن العلاقة قائمة.
  if (error && error.code !== "23505") throw error;
}

export async function respondToFriendRequest(id: string, accept: boolean): Promise<void> {
  if (USE_MOCK_DATA) {
    mock.requests = mock.requests.filter((request) => request.id !== id);
    return;
  }
  if (!accept) {
    const { error } = await supabase.from("friendships").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** حذف الصداقة من الطرفين — ومن أراد المنع فليحجب. */
export async function removeFriend(otherId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    mock.friends = mock.friends.filter((friend) => friend.id !== otherId);
    return;
  }
  const { data: me } = await supabase.auth.getUser();
  const myId = me.user?.id;
  if (!myId) return;
  const { error } = await supabase
    .from("friendships")
    .delete()
    .or(
      `and(requester_id.eq.${myId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${myId})`
    );
  if (error) throw error;
}

/* ------------------------------ المحادثات ------------------------------ */

export async function fetchConversations(): Promise<ConversationSummary[]> {
  if (USE_MOCK_DATA) return [...mock.conversations];
  const { data, error } = await supabase.rpc("my_conversations");
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    kind: row.kind === "group" ? "group" : "direct",
    title: String(row.title ?? ""),
    image: (row.image as string) ?? undefined,
    lastMessage: String(row.last_message ?? ""),
    lastMessageAt: String(row.last_message_at ?? ""),
    unread: Number(row.unread ?? 0),
  }));
}

export async function startDirectChat(otherId: string): Promise<string> {
  if (USE_MOCK_DATA) return "conv-1";
  const { data, error } = await supabase.rpc("start_direct_chat", { p_other: otherId });
  if (error) throw error;
  return String(data);
}

export async function createGroupChat(title: string, memberIds: string[]): Promise<string> {
  if (USE_MOCK_DATA) return "conv-2";
  const { data, error } = await supabase.rpc("create_group_chat", {
    p_title: title.trim(),
    p_members: memberIds,
  });
  if (error) throw error;
  return String(data);
}

export async function addGroupMember(conversationId: string, userId: string): Promise<void> {
  if (USE_MOCK_DATA) return;
  const { error } = await supabase.rpc("add_group_member", {
    p_conversation: conversationId,
    p_user: userId,
  });
  if (error) throw error;
}

export async function fetchConversationPeople(conversationId: string): Promise<Person[]> {
  if (USE_MOCK_DATA) return [...mock.friends];
  const { data, error } = await supabase.rpc("conversation_people", {
    p_conversation: conversationId,
  });
  if (error) throw error;
  return ((data ?? []) as { id: string; full_name: string }[]).map((row) => ({
    id: row.id,
    fullName: row.full_name,
  }));
}

/**
 * رسائل محادثة، أقدمها أوّلًا.
 *
 * والربط بـ users بلا تسمية المفتاح: لا يشير إليه من هذا الجدول إلا
 * sender_id، فلا لبس — ولو أُضيف مفتاحٌ ثانٍ وجب تسميته.
 *
 * واسم المرسل يأتي بربطٍ لا بنداء ثانٍ: قائمةٌ من مئة رسالة بمئة نداء تصير
 * شاشةً تتأخّر ثانيتين عند كل فتح.
 */
export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  if (USE_MOCK_DATA) return mock.messages[conversationId] ?? [];
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*, users(full_name)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    conversationId: String(row.conversation_id),
    senderId: String(row.sender_id),
    senderName: (row.users as { full_name?: string } | null)?.full_name,
    body: String(row.body ?? ""),
    image: (row.image as string) ?? undefined,
    createdAt: String(row.created_at ?? ""),
  }));
}

export async function sendMessage(
  conversationId: string,
  body: string,
  image?: string
): Promise<void> {
  const text = body.trim();
  if (!text && !image) return;
  if (USE_MOCK_DATA) {
    const list = mock.messages[conversationId] ?? [];
    list.push({
      id: `m-${Date.now()}`, conversationId, senderId: "me", body: text,
      image, createdAt: new Date().toISOString(),
    });
    mock.messages[conversationId] = list;
    return;
  }
  const { data: me } = await supabase.auth.getUser();
  const sender = me.user?.id;
  if (!sender) throw new Error("سجّل الدخول أولًا");
  const { error } = await supabase
    .from("chat_messages")
    .insert({ conversation_id: conversationId, sender_id: sender, body: text, image: image ?? null });
  if (error) throw error;
}

export async function deleteMessage(id: string): Promise<void> {
  if (USE_MOCK_DATA) return;
  const { error } = await supabase.from("chat_messages").delete().eq("id", id);
  if (error) throw error;
}

export async function reportMessage(messageId: string, reason: string): Promise<void> {
  if (USE_MOCK_DATA) return;
  const { error } = await supabase.rpc("report_chat_message", {
    p_message: messageId,
    p_reason: reason,
  });
  if (error) throw error;
}

/** تعليم المحادثة مقروءة — به يُحسب عدّاد غير المقروء. */
export async function markConversationRead(conversationId: string): Promise<void> {
  if (USE_MOCK_DATA) return;
  const { data: me } = await supabase.auth.getUser();
  const myId = me.user?.id;
  if (!myId) return;
  const { error } = await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", myId);
  if (error) throw error;
}

export async function leaveConversation(conversationId: string): Promise<void> {
  if (USE_MOCK_DATA) return;
  const { data: me } = await supabase.auth.getUser();
  const myId = me.user?.id;
  if (!myId) return;
  const { error } = await supabase
    .from("conversation_members")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", myId);
  if (error) throw error;
}

/* ------------------------------- البلاغات ------------------------------- */

export interface ChatReport {
  id: string;
  body: string;
  reason: string;
  createdAt: string;
  reporterName?: string;
  reportedName?: string;
}

/**
 * بلاغات المحادثات — للإدارة.
 *
 * ولا تُعرض المحادثة كلّها ولا يُفتح بابٌ إليها: الظاهر هو نصّ الرسالة
 * المُبلَّغ عنها وحدها، منسوخًا وقت البلاغ فلا يمحوه حذفها بعده.
 */
export async function fetchChatReports(): Promise<ChatReport[]> {
  if (USE_MOCK_DATA) return [];
  const { data, error } = await supabase
    .from("chat_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    body: String(row.body ?? ""),
    reason: String(row.reason ?? ""),
    createdAt: String(row.created_at ?? ""),
  }));
}
