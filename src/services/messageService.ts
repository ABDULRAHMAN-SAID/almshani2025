import type { MediaAttachment, MessageKind, MessageStatus, UserMessage } from "@/types/models";
import { USE_MOCK_DATA } from "./config";
import { supabase } from "./supabase";

/**
 * مراسلة الإدارة.
 *
 * قناة رسمية باتجاه واحد: المستخدم يكتب إلى قسم الأنشطة، والقسم يردّ.
 * لا يوجد أي مسار يجعل مستخدمًا يراسل مستخدمًا آخر، ولا يُعرض رقم أحد لأحد —
 * الإدارة ترى الاسم فقط.
 */

const today = () => new Date().toISOString().slice(0, 10);

/** صندوق تجريبي قابل للتعديل، يعيش في الذاكرة فقط. */
const mockMessages: UserMessage[] = [
  {
    id: "msg-1",
    userId: "me",
    userName: "سالم بن عبدالله",
    kind: "اقتراح",
    subject: "إضافة بطولة كرة طائرة",
    body: "أقترح إضافة بطولة كرة طائرة ضمن الأنشطة الرياضية، فهناك اهتمام كبير بها بين المشاركين.",
    attachments: [],
    status: "answered",
    reply: {
      body: "شكرًا لاقتراحك. أُدرج المقترح ضمن خطة الفصل القادم وسيصلك إعلان عند فتح التسجيل.",
      repliedAt: today(),
    },
    createdAt: today(),
  },
];

interface SendMessageInput {
  userId: string;
  userName: string;
  kind: MessageKind;
  subject: string;
  body: string;
  attachments: MediaAttachment[];
}

const toMessage = (row: Record<string, unknown>): UserMessage => ({
  id: String(row.id),
  userId: String(row.user_id),
  userName: String(row.user_name ?? ""),
  kind: row.kind as MessageKind,
  subject: String(row.subject ?? ""),
  body: String(row.body ?? ""),
  attachments: (row.attachments as MediaAttachment[]) ?? [],
  status: (row.status as MessageStatus) ?? "new",
  reply: row.reply_body
    ? { body: String(row.reply_body), repliedAt: String(row.replied_at ?? "") }
    : undefined,
  createdAt: String(row.created_at ?? "").slice(0, 10),
});

/** إرسال رسالة إلى الإدارة. */
export async function sendMessage(input: SendMessageInput): Promise<UserMessage> {
  const message: UserMessage = {
    ...input,
    id: `msg-${Date.now()}`,
    status: "new",
    createdAt: today(),
  };

  if (!USE_MOCK_DATA) {
    const { data, error } = await supabase
      .from("user_messages")
      .insert({
        user_id: input.userId,
        user_name: input.userName,
        kind: input.kind,
        subject: input.subject,
        body: input.body,
        attachments: input.attachments,
      })
      .select()
      .single();
    if (error) throw error;
    return toMessage(data as Record<string, unknown>);
  }

  mockMessages.unshift(message);
  return message;
}

/** رسائل المستخدم نفسه مع ردود الإدارة عليها. */
export async function fetchMyMessages(userId: string): Promise<UserMessage[]> {
  if (USE_MOCK_DATA) {
    return mockMessages.filter((message) => message.userId === userId);
  }
  const { data, error } = await supabase
    .from("user_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data as Record<string, unknown>[]) ?? []).map(toMessage);
}

/** كل الرسائل الواردة — للإدارة فقط (سياسة RLS تمنع غيرها). */
export async function fetchAllMessages(): Promise<UserMessage[]> {
  if (USE_MOCK_DATA) {
    return [...mockMessages];
  }
  const { data, error } = await supabase
    .from("user_messages")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data as Record<string, unknown>[]) ?? []).map(toMessage);
}

/** تعليم الرسالة كمقروءة. */
export async function markMessageRead(id: string): Promise<void> {
  if (!USE_MOCK_DATA) {
    const { error } = await supabase
      .from("user_messages")
      .update({ status: "read" })
      .eq("id", id)
      .eq("status", "new");
    if (error) throw error;
    return;
  }
  const message = mockMessages.find((item) => item.id === id);
  if (message && message.status === "new") message.status = "read";
}

/** ردّ الإدارة — يظهر لصاحب الرسالة وحده داخل «رسائلي». */
export async function replyToMessage(id: string, body: string): Promise<void> {
  const text = body.trim();
  if (text.length < 2) throw new Error("اكتب نص الرد أولًا.");

  if (!USE_MOCK_DATA) {
    const { error } = await supabase.rpc("reply_to_message", { p_message_id: id, p_body: text });
    if (error) throw error;
    return;
  }

  const message = mockMessages.find((item) => item.id === id);
  if (message) {
    message.reply = { body: text, repliedAt: today() };
    message.status = "answered";
  }
}

export async function deleteMessage(id: string): Promise<void> {
  if (!USE_MOCK_DATA) {
    const { error } = await supabase.from("user_messages").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  const index = mockMessages.findIndex((item) => item.id === id);
  if (index >= 0) mockMessages.splice(index, 1);
}
