import { Text, View } from 'react-native';
import palette from '@/theme/palette';

type Item = {
  label: string;
  count: number;
  /** Part des répondants (0..1), affichée en % si présente */
  ratio?: number;
  /** Couleur de la barre (violet par défaut) */
  color?: string;
};

type Props = {
  items: Item[];
  emptyText?: string;
};

// Barres colorées sur piste crème, proportionnelles au max
export function BarList({ items, emptyText = 'Rien à afficher' }: Props) {
  if (items.length === 0) return <Text className="font-sans text-sm text-ink/50">{emptyText}</Text>;
  const max = Math.max(1, ...items.map((item) => item.count));

  return (
    <View className="gap-3">
      {items.map((item) => (
        <View key={item.label}>
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 font-sans text-sm text-ink" numberOfLines={1}>
              {item.label}
            </Text>
            <Text className="ml-3 font-sans text-xs text-ink/50">
              {item.ratio !== undefined ? `${Math.round(item.ratio * 100)} % · ` : ''}
              {item.count}
            </Text>
          </View>
          <View className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface">
            <View
              className="h-2 rounded-full"
              style={{ width: `${(item.count / max) * 100}%`, backgroundColor: item.color ?? palette.accent }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
