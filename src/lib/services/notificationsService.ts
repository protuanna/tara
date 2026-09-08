import { createClient } from "@/lib/supabase/server";

export type NotificationDTO = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  read: boolean;
  createdAt: string;
};

const LIST_LIMIT = 30;

export const notificationsService = {
  async list(): Promise<NotificationDTO[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, body, url, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT);
    if (error) throw error;

    return (data ?? []).map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      url: n.url,
      read: n.read_at !== null,
      createdAt: n.created_at,
    }));
  },

  async create(input: { title: string; body: string; url?: string | null }): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("notifications").insert({
      title: input.title,
      body: input.body,
      url: input.url ?? null,
    });
    if (error) throw error;
  },

  async markAllRead(): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    if (error) throw error;
  },
};
