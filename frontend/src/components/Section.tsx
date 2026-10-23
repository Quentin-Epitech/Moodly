import type { ReactNode } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import { Hairline, MicroLabel } from './Typography';

type Props = {
  index: number;
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  /** Position de la section (défilement depuis un sommaire) */
  onLayout?: (event: LayoutChangeEvent) => void;
};

// Bloc numéroté séparé par un filet : « 01 / Les raisons »
export function Section({ index, title, hint, children, className = 'mt-10', onLayout }: Props) {
  return (
    <View className={className} onLayout={onLayout}>
      <Hairline />
      <View className="mt-5 flex-row items-center">
        <MicroLabel tone="accent">{String(index).padStart(2, '0')}</MicroLabel>
        <MicroLabel tone="faint" className="mx-2">
          /
        </MicroLabel>
        <MicroLabel tone="ink">{title}</MicroLabel>
      </View>
      {hint ? <Text className="mt-1.5 font-sans text-xs text-ink/50">{hint}</Text> : null}
      <View className="mt-5">{children}</View>
    </View>
  );
}
