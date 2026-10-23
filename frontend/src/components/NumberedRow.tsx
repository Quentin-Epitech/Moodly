import { ArrowRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import palette from '@/theme/palette';

type Props = {
  index: number;
  label: string;
  /** Contenu à droite du libellé (valeur, état…) */
  detail?: ReactNode;
  onPress?: () => void;
};

// « 01 / Conversational » : ligne grise numérotée avec flèche
export function NumberedRow({ index, label, detail, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      className={`flex-row items-center justify-between rounded-lg bg-surface px-5 py-4 ${onPress ? 'active:bg-surface2 hover:bg-surface2' : ''}`}
    >
      <View className="flex-row items-center">
        <Text className="font-sans-medium text-sm text-accent">{String(index).padStart(2, '0')}</Text>
        <Text className="mx-2 font-sans text-sm text-ink/30">/</Text>
        <Text className="font-sans-medium text-sm text-ink">{label}</Text>
      </View>
      <View className="flex-row items-center gap-4">
        {detail}
        <ArrowRight size={16} color={onPress ? palette.accent : palette.hidden} />
      </View>
    </Pressable>
  );
}
