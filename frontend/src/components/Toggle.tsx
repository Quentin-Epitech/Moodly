import { Pressable, Text, View } from 'react-native';

type Props = { label: string; hint?: string; value: boolean; onChange: (value: boolean) => void };

// Case à cocher en ligne (interrupteur accessible)
export function Toggle({ label, hint, value, onChange }: Props) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => onChange(!value)}
      className="flex-row items-start gap-3 py-2 active:opacity-70"
    >
      <View
        className={`mt-0.5 h-6 w-10 justify-center rounded-full px-0.5 ${value ? 'items-end bg-accent' : 'items-start bg-line'}`}
      >
        <View className="h-5 w-5 rounded-full bg-white" />
      </View>
      <View className="flex-1">
        <Text className="font-sans-medium text-[15px] text-ink">{label}</Text>
        {hint ? <Text className="mt-1 font-sans text-xs leading-5 text-ink/50">{hint}</Text> : null}
      </View>
    </Pressable>
  );
}
