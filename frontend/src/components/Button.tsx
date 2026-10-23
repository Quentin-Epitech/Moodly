import { ActivityIndicator, Pressable, Text } from 'react-native';
import palette from '@/theme/palette';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
};

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-ink active:bg-ink/90 hover:bg-ink/90',
  secondary: 'bg-surface active:bg-surface2 hover:bg-surface2',
  ghost: 'bg-transparent active:opacity-60 hover:opacity-70',
};

const LABEL: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-ink',
  ghost: 'text-ink/70',
};

// Bouton pilule : noir plein par défaut
export function Button({ title, onPress, variant = 'primary', disabled = false, loading = false }: Props) {
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      onPress={onPress}
      disabled={inactive}
      className={`items-center justify-center rounded-lg px-6 py-3.5 ${CONTAINER[variant]} ${inactive ? 'opacity-40' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? palette.bg : palette.ink} />
      ) : (
        <Text className={`font-sans-medium text-sm ${LABEL[variant]}`}>{title}</Text>
      )}
    </Pressable>
  );
}
