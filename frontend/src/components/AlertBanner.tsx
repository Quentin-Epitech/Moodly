import { Text, View } from 'react-native';
import type { TeamAlert } from '@/api';
import { MicroLabel } from './Typography';

// Panneau pastel (ambre en vigilance, corail en alerte) : une étiquette, la phrase en serif
export function AlertBanner({ alert }: { alert: TeamAlert }) {
  if (alert.level === 'none') return null;
  const critical = alert.level === 'alert';

  return (
    <View className={`rounded-lg px-5 py-5 ${critical ? 'bg-danger-soft' : 'bg-warning-soft'}`}>
      <View className="flex-row items-center gap-2">
        <View className={`h-2 w-2 rounded-full ${critical ? 'bg-danger' : 'bg-warning'}`} />
        <MicroLabel tone={critical ? 'danger' : 'warning'}>{critical ? 'Alerte' : 'Vigilance'}</MicroLabel>
      </View>
      <Text className="mt-3 font-serif text-[22px] leading-7 tracking-[-0.3px] text-ink">{alert.message}</Text>
      {alert.drivers.length > 0 && (
        <View className="mt-4 flex-row flex-wrap gap-2">
          {alert.drivers.map((driver) => (
            <View key={driver.label} className="rounded-full bg-white px-3 py-1.5">
              <Text className="font-sans text-xs text-ink">
                {driver.label} · {driver.count}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
