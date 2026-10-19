import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Highlight } from '../components/Highlight';
import { LogoMark } from '../components/Logo';
import { useLayout } from '../layout';
import { color, font } from '../theme';

export function Outro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { portrait } = useLayout();
  const logo = spring({ frame, fps, config: { damping: 12 } });
  const fade = (at: number) => interpolate(frame, [at, at + 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: portrait ? 50 : 38, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32, transform: `scale(${0.7 + 0.3 * logo})`, opacity: logo }}>
          <LogoMark size={portrait ? 150 : 130} />
          <span style={{ fontFamily: font.sans, fontWeight: 600, fontSize: portrait ? 120 : 112, letterSpacing: -4, color: color.ink }}>Moodly</span>
        </div>
        <div style={{ fontFamily: font.serif, fontSize: portrait ? 64 : 58, letterSpacing: -1.2, color: color.ink, opacity: fade(14), maxWidth: portrait ? 900 : 1500 }}>
          Le moral de l'équipe,{portrait ? <br /> : ' '}
          <Highlight tone={color.marker.sun} at={22}>
            sans jamais savoir qui.
          </Highlight>
        </div>
        <div style={{ fontFamily: font.sans, fontSize: portrait ? 30 : 28, color: color.muted, opacity: fade(40), lineHeight: 1.6 }}>
          iPhone · Android · Web
          <br />
          Expo · Express · Prisma · Postgres (Supabase)
        </div>
        <div style={{ fontFamily: font.sans, fontWeight: 600, fontSize: portrait ? 24 : 22, letterSpacing: 6, color: color.accent, textTransform: 'uppercase', opacity: fade(56) }}>
          Projet Epitech · 2026
        </div>
      </div>
    </AbsoluteFill>
  );
}
