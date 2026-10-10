import "server-only";
import OpenAI from "openai";
import { getSetting } from "@/lib/settings";

let client: OpenAI | null = null;

export function openai(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Thiếu biến môi trường OPENAI_API_KEY. Xem file .env.example.");
  }
  client ??= new OpenAI({ timeout: 30_000, maxRetries: 1 });
  return client;
}

/** Model trò chuyện (admin đổi được trong Tình trạng Mây). */
export const chatModel = async () => (await getSetting("ai.models")).chat;
/** Model kiểm tra an toàn. */
export const safetyModel = async () => (await getSetting("ai.models")).safety;

export const EMBEDDING_MODEL = "text-embedding-3-small";
