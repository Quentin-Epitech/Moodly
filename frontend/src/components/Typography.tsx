import { Text, View, type TextProps } from 'react-native';

type Tone = 'muted' | 'ink' | 'faint' | 'accent' | 'warning' | 'danger';

const MICRO_TONE: Record<Tone, string> = {
  muted: 'text-ink/50',
  ink: 'text-ink',
  faint: 'text-ink/30',
  accent: 'text-accent',
  warning: 'text-warning',
  danger: 'text-danger',
};

type MicroLabelProps = TextProps & { className?: string; tone?: Tone };

/** Étiquette capitale, espacée : « WHAT DO WE DO? » */
export function MicroLabel({ className = '', tone = 'muted', ...props }: MicroLabelProps) {
  return (
    <Text
      className={`font-sans-medium text-[11px] uppercase tracking-[2px] ${MICRO_TONE[tone]} ${className}`}
      {...props}
    />
  );
}

type DisplayProps = TextProps & { className?: string; size?: 'xl' | 'lg' | 'md' };

// Plus grand sur grand écran (web, tablette)
const DISPLAY_SIZE = {
  xl: 'text-[44px] leading-[48px] tracking-[-1.6px] md:text-[64px] md:leading-[68px] md:tracking-[-2.4px]',
  lg: 'text-[34px] leading-[38px] tracking-[-1px] md:text-[44px] md:leading-[48px] md:tracking-[-1.6px]',
  md: 'text-[24px] leading-[30px] tracking-[-0.5px] md:text-[28px] md:leading-[34px]',
};

/** Titre en serif éditoriale */
export function Display({ className = '', size = 'lg', ...props }: DisplayProps) {
  return <Text className={`font-serif text-ink ${DISPLAY_SIZE[size]} ${className}`} {...props} />;
}

type BodyProps = TextProps & { className?: string; tone?: 'muted' | 'ink' };

/** Paragraphe courant */
export function Body({ className = '', tone = 'muted', ...props }: BodyProps) {
  return (
    <Text
      className={`font-sans text-[15px] leading-6 ${tone === 'ink' ? 'text-ink' : 'text-ink/70'} ${className}`}
      {...props}
    />
  );
}

/** Filet d'un pixel */
export function Hairline({ className = '' }: { className?: string }) {
  return <View className={`h-px w-full bg-line ${className}`} />;
}

type HighlightProps = { children: string; color?: 'sun' | 'violet' | 'mint' | 'peach' | 'sky' };

const HIGHLIGHT_BG = {
  sun: 'bg-marker-sun',
  violet: 'bg-marker-violet',
  mint: 'bg-marker-mint',
  peach: 'bg-marker-peach',
  sky: 'bg-marker-sky',
};

/** Mot surligné au feutre dans un titre : <Display>Comment <Highlight>ça va</Highlight> ?</Display> */
export function Highlight({ children, color = 'sun' }: HighlightProps) {
  return <Text className={`${HIGHLIGHT_BG[color]} rounded-md`}>{children}</Text>;
}
