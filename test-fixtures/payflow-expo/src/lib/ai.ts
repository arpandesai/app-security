import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.EXPO_PUBLIC_OPENAI_KEY, dangerouslyAllowBrowser: true });

export async function explainTransaction(text: string) {
  const res = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: text }] });
  return res.choices[0].message.content;
}
