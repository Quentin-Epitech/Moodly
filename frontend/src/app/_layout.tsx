import '../../global.css';

import { Fraunces_400Regular } from '@expo-google-fonts/fraunces';
import { Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { AuthProvider } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Body, Display, MicroLabel } from '@/components/Typography';
import palette from '@/theme/palette';

// On garde le splash tant que les polices ne sont pas prêtes : pas de texte qui « saute »
SplashScreen.preventAutoHideAsync();

// Titres d'onglet sur web (les en-têtes natifs sont masqués)
const TITLES: Record<string, string> = {
  index: 'Moodly',
  login: 'Connexion · Moodly',
  password: 'Mot de passe · Moodly',
  confidentialite: 'Confidentialité · Moodly',
  onboarding: 'Avant de commencer · Moodly',
  employee: 'Ma journée · Moodly',
  bilan: 'Bilan de la semaine · Moodly',
  suivi: 'Mon suivi · Moodly',
  conseils: 'Conseils · Moodly',
  'demandes/index': 'Demandes · Moodly',
  'demandes/nouvelle': 'Nouvelle demande · Moodly',
  'demandes/[id]': 'Demande · Moodly',
};

// Écran affiché si un écran plante : jamais d'écran blanc ni de pile d'erreur pour l'utilisateur
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  if (__DEV__) console.error(error);
  return (
    <Screen>
      <View className="flex-1 justify-center">
        <MicroLabel>Erreur</MicroLabel>
        <Display className="mt-3">Un problème est survenu.</Display>
        <Body className="mt-4">
          L'écran n'a pas pu s'afficher. Réessayez ; si le problème persiste, relancez l'app.
        </Body>
        <View className="mt-8">
          <Button title="Réessayer" onPress={() => void retry()} />
        </View>
      </View>
    </Screen>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useFonts({
    Fraunces_400Regular,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontsError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontsError]);

  if (!fontsLoaded && !fontsError) return null;

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }}>
        {Object.entries(TITLES).map(([name, title]) => (
          <Stack.Screen key={name} name={name} options={{ title }} />
        ))}
      </Stack>
    </AuthProvider>
  );
}
