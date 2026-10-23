import { Pressable, Text } from 'react-native';
import { useAuth } from '@/auth/AuthContext';

export function LogoutButton() {
  const { signOut } = useAuth();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => void signOut()}
      className="py-2 active:opacity-60 hover:opacity-70"
    >
      <Text className="font-sans text-sm text-ink/70">Se déconnecter</Text>
    </Pressable>
  );
}
