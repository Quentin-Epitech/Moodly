import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { LogoutButton } from './LogoutButton';

// Liens du compte, en haut à droite : mot de passe et déconnexion
export function AccountMenu() {
  return (
    <View className="flex-row items-center gap-4">
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push('/password')}
        className="py-2 active:opacity-60 hover:opacity-70"
      >
        <Text className="font-sans text-sm text-ink/70">Mot de passe</Text>
      </Pressable>
      <LogoutButton />
    </View>
  );
}
