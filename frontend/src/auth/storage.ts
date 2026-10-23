import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Le token JWT vit dans le trousseau du téléphone (expo-secure-store).
// Sur web (tests rapides dans un navigateur), SecureStore n'existe pas : localStorage.

const TOKEN_KEY = 'moodly.token';
const onboardingKey = (userId: number) => `moodly.onboarding.${userId}`;

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const tokenStorage = {
  get: () => getItem(TOKEN_KEY),
  set: (token: string) => setItem(TOKEN_KEY, token),
  clear: () => removeItem(TOKEN_KEY),
};

// L'onboarding n'est montré qu'une fois par utilisateur sur cet appareil
export const onboardingStorage = {
  isDone: async (userId: number) => (await getItem(onboardingKey(userId))) === '1',
  markDone: (userId: number) => setItem(onboardingKey(userId), '1'),
};

/** Petites valeurs sensibles (codes de suivi des demandes anonymes) : trousseau du téléphone */
export const secureStorage = {
  get: getItem,
  set: setItem,
  remove: removeItem,
};
