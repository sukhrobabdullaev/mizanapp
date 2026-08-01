/** JWT storage.
 *
 * Tokens live in the device keychain via expo-secure-store, never in
 * AsyncStorage (which is plaintext on disk).
 */

import * as SecureStore from 'expo-secure-store';

import type { TokenPair } from '../types/api';

const ACCESS_KEY = 'mizan.access';
const REFRESH_KEY = 'mizan.refresh';

/** In-memory mirror so the axios interceptor stays synchronous on the hot path. */
let cachedAccess: string | null = null;

export async function saveTokens(tokens: TokenPair): Promise<void> {
  cachedAccess = tokens.access;
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, tokens.access),
    SecureStore.setItemAsync(REFRESH_KEY, tokens.refresh),
  ]);
}

export async function saveAccessToken(access: string): Promise<void> {
  cachedAccess = access;
  await SecureStore.setItemAsync(ACCESS_KEY, access);
}

export async function getAccessToken(): Promise<string | null> {
  if (cachedAccess) return cachedAccess;
  cachedAccess = await SecureStore.getItemAsync(ACCESS_KEY);
  return cachedAccess;
}

export function peekAccessToken(): string | null {
  return cachedAccess;
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function clearTokens(): Promise<void> {
  cachedAccess = null;
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
}
