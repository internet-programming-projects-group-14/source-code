// utils/identity.ts
import * as SecureStore from "expo-secure-store";
import { v4 as uuidv4 } from "uuid";

const TOKEN_KEY = "user_unique_id";

export async function getOrCreateUserId(): Promise<string> {
  let userId = await SecureStore.getItemAsync(TOKEN_KEY);

  if (!userId) {
    userId = uuidv4();
    await SecureStore.setItemAsync(TOKEN_KEY, userId);
    console.log("Generated new user ID:", userId);
  }

  return userId;
}

export async function resetUserId() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
