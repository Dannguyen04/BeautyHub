import { createClient } from "@supabase/supabase-js";
import type { Provider } from "./domain";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configured = Boolean(url && key && /^https:\/\//.test(url));
export const db = configured
  ? createClient(url, key, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
export function client() {
  if (!db)
    throw new Error(
      "BeautyHub đang chuẩn bị mở cửa. Chức năng này chưa khả dụng.",
    );
  return db;
}
export async function rpc<T = unknown>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await client().rpc(name, args);
  if (error) throw error;
  return data as T;
}
export async function listProviders(): Promise<Provider[]> {
  const { data, error } = await client()
    .from("providers")
    .select("*,packages(*),portfolio_assets(*),reviews(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const providers = (data || []) as Provider[];
  const stats =
    await rpc<{ provider_id: string; completed_count: number }[]>(
      "provider_stats",
    );
  providers.forEach((p) => {
    p.completed_count = Number(
      stats.find((s) => s.provider_id === p.id)?.completed_count || 0,
    );
  });
  const assets = providers.flatMap((p) => p.portfolio_assets);
  if (assets.length) {
    const { data: urls } = await client()
      .storage.from("portfolio")
      .createSignedUrls(
        assets.map((a) => a.path),
        3600,
      );
    assets.forEach((a) => {
      a.url = urls?.find((u) => u.path === a.path)?.signedUrl || undefined;
    });
  }
  return providers;
}
export async function track(event: string) {
  if (!db) return;
  try {
    await db.rpc("track_event", { p_event: event });
  } catch {
    /* Analytics must never block booking. */
  }
}
export async function compressImage(file: File): Promise<Blob> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 12 * 1024 * 1024
  )
    throw new Error("Chọn ảnh JPG, PNG hoặc WebP dưới 12 MB.");
  const image = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    const ratio = Math.min(1, 1400 / Math.max(image.width, image.height));
    canvas.width = Math.round(image.width * ratio);
    canvas.height = Math.round(image.height * ratio);
    canvas
      .getContext("2d")!
      .drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Không xử lý được ảnh."))),
        "image/webp",
        0.76,
      ),
    );
    if (blob.size > 524288)
      throw new Error(
        "Ảnh sau nén vẫn lớn hơn 512 KB. Vui lòng chọn ảnh nhỏ hơn.",
      );
    return blob;
  } finally {
    image.close();
  }
}
