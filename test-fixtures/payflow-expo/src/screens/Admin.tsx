import { supabase } from "../lib/supabase";

export async function loadUsers(user: { role: string }) {
  if (user.role === "admin") {
    const { data } = await supabase.from("profiles").select("*");
    return data;
  }
  return [];
}
