import { Pressable, Text } from 'react-native';

type Props = {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
};

// Pastille : contour fin, violette quand sélectionnée
export function Chip({ label, selected, disabled = false, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      disabled={disabled}
      className={`rounded-full border px-4 py-2 ${selected ? 'border-accent bg-accent' : 'border-line bg-white active:bg-accent-soft hover:bg-accent-soft'} ${disabled ? 'opacity-40' : ''}`}
    >
      <Text className={`font-sans text-sm ${selected ? 'text-white' : 'text-ink'}`}>{label}</Text>
    </Pressable>
  );
}
