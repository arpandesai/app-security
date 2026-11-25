import { supabase } from "@/lib/supabase";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await supabase.from("posts").delete().eq("id", id);
  return Response.json({ ok: true });
}
