import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Highlight } from '../components/Highlight';
import { LogoMark } from '../components/Logo';
import { useLayout } from '../layout';
import { color, font } from '../theme';
import { useExit } from './motion';

export function Intro({ duration, pace = 1 }: { duration: number; pace?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { portrait } = useLayout();
  const ring = spring({ frame, fps, config: { damping: 12 } });
  const t = (value: number) => value * pace;
  const dot = spring({ frame: frame - t(10), fps, config: { damping: 8 } });
  const word = interpolate(frame, [t(18), t(34)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tagline = interpolate(frame, [t(40), t(58)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const exit = useExit(duration);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: exit }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: portrait ? 60 : 44 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          <LogoMark size={portrait ? 170 : 150} ring={ring} dot={dot} />
          <span
            style={{
              fontFamily: font.sans,
              fontWeight: 600,
              fontSize: portrait ? 132 : 128,
              letterSpacing: -4,
              color: color.ink,
              opacity: word,
              transform: `translateX(${(1 - word) * -20}px)`,
            }}
          >
            Moodly
          </span>
        </div>
        <div
          style={{
            fontFamily: font.serif,
            fontSize: portrait ? 72 : 64,
            lineHeight: 1.15,
            letterSpacing: -1.5,
            color: color.ink,
            textAlign: 'center',
            opacity: tagline,
            transform: `translateY(${(1 - tagline) * 24}px)`,
            maxWidth: portrait ? 900 : 1400,
          }}
        >
          Le moral de l'équipe,{portrait ? <br /> : ' '}
          <Highlight tone={color.marker.sun} at={t(62)}>
            sans jamais savoir qui.
          </Highlight>
        </div>
      </div>
    </AbsoluteFill>
  );
}
