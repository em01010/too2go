import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'too2go.onboarding.done';

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
  } catch {
    // sin almacenamiento: no pasa nada, se vuelve a mostrar
  }
}
