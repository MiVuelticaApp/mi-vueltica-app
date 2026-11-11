import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { kv } from '../storage/kv';

const TOKEN_KEY = 'mv.auth.token';
const PROVIDER_KEY = 'mv.auth.provider';

/** JWT in the Keychain / Keystore on native; the app key-value store on web (web is a test target only). */
const native = Platform.OS !== 'web';

async function read(key: string): Promise<string | null> {
  try {
    return native ? await SecureStore.getItemAsync(key) : await kv.getItem(key);
  } catch {
    return null;
  }
}
async function write(key: string, value: string): Promise<void> {
  if (native) await SecureStore.setItemAsync(key, value);
  else await kv.setItem(key, value);
}
async function remove(key: string): Promise<void> {
  try {
    if (native) await SecureStore.deleteItemAsync(key);
    else await kv.removeItem(key);
  } catch {
    /* nothing to delete */
  }
}

let cached: string | null | undefined;

export const tokenStore = {
  async get(): Promise<string | null> {
    if (cached === undefined) cached = await read(TOKEN_KEY);
    return cached;
  },
  async set(token: string): Promise<void> {
    cached = token;
    await write(TOKEN_KEY, token);
  },
  async clear(): Promise<void> {
    cached = null;
    await remove(TOKEN_KEY);
    await remove(PROVIDER_KEY);
  },
  /** Which provider signed the user in: the API does not return it, and Apple account deletion needs to know. */
  getProvider: () => read(PROVIDER_KEY),
  setProvider: (p: string) => write(PROVIDER_KEY, p),
};
