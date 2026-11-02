import { z } from "zod";
import { isCoverSize, pathForSize } from "@/features/catalogue/cover";
import { createClient } from "@/lib/database/server";

const notFound = () => new Response("Not found", { status: 404 });

/**
 * Serves one cover image to the signed-in person who owns it. Storage is private, so the
 * browser never gets a storage link. Row-level security decides what the person may read: the
 * game_images row, then the file, are both read with their own session.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ imageId: string }> },
) {
  const { imageId } = await params;
  const size = new URL(request.url).searchParams.get("size") ?? "cover";
  if (!z.uuid().safeParse(imageId).success || !isCoverSize(size)) {
    return notFound();
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Sign in required", { status: 401 });

  const { data: row } = await supabase
    .from("game_images")
    .select("storage_path")
    .eq("id", imageId)
    .eq("kind", "cover")
    .maybeSingle();
  if (!row?.storage_path) return notFound();

  const headers = {
    // Private to this browser. The URL carries a version, so it can be kept for a year.
    "Cache-Control": "private, max-age=31536000, immutable",
    Vary: "Cookie",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'",
  };
  const path = pathForSize(row.storage_path, size);
  // The folder name changes on every replace, so it works as a version tag.
  const etag = `"${path.split("/")[2] ?? ""}-${size}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, {
      status: 304,
      headers: { ...headers, ETag: etag },
    });
  }

  const { data: file, error } = await supabase.storage
    .from("covers")
    .download(path);
  if (error || !file) return notFound();

  return new Response(await file.arrayBuffer(), {
    headers: { ...headers, "Content-Type": "image/webp", ETag: etag },
  });
}
