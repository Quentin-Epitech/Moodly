import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { homeHref } from '@/auth/routes';
import palette from '@/theme/palette';

// Aiguillage : connexion → onboarding (première fois) → écran selon le rôle
export default function Index() {
  const { status, user, onboardingDone } = useAuth();

  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={palette.ink} />
      </View>
    );
  }

  if (status === 'signedOut' || !user) return <Redirect href="/login" />;
  return <Redirect href={homeHref(user, onboardingDone)} />;
}
