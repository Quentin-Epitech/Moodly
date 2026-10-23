import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import palette from '@/theme/palette';
import { Logo } from './Logo';

type Props = {
  /** Élément à droite (lien de déconnexion…) */
  right?: ReactNode;
  /** Remplace le logo par un lien de retour */
  back?: { label: string; onPress: () => void };
};

// Première ligne de chaque écran : marque à gauche, action à droite
export function TopBar({ right, back }: Props) {
  return (
    <View className="flex-row items-center justify-between py-2">
      {back ? (
        <Pressable
          accessibilityRole="button"
          onPress={back.onPress}
          className="flex-row items-center gap-2 active:opacity-60"
        >
          <ArrowLeft size={16} color={palette.ink} />
          <Text className="font-sans text-sm text-ink">{back.label}</Text>
        </Pressable>
      ) : (
        <Logo />
      )}
      {right ?? null}
    </View>
  );
}
