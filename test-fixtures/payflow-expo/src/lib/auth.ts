import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { router } from "expo-router";

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  console.log("login ok", data.session);
  await AsyncStorage.setItem("access_token", data.session!.access_token);
  await AsyncStorage.setItem("refresh_token", data.session!.refresh_token);
  return data.user;
}

export async function logout() {
  router.replace("/login");
}

export function newInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
