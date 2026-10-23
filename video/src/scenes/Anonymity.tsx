import type { ReactNode } from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Highlight } from '../components/Highlight';
import { useLayout } from '../layout';
import { color, font } from '../theme';
import { useExit } from './motion';

function Card({ label, rows, note, at, tone }: { label: string; rows: ReactNode[]; note: string; at: number; tone: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { portrait } = useLayout();
  const k = spring({ frame: frame - at, fps, config: { damping: 16 } });
  return (
    <div
      style={{
        width: portrait ? 860 : 620,
        backgroundColor: '#ffffff',
        borderRadius: 28,
        padding: portrait ? '40px 44px' : '36px 40px',
        boxShadow: '0 30px 60px rgba(27, 26, 34, 0.10)',
        opacity: k,
        transform: `translateY(${(1 - k) * 40}px) scale(${0.96 + 0.04 * k})`,
        borderTop: `10px solid ${tone}`,
      }}
    >
      <div style={{ fontFamily: font.sans, fontWeight: 600, fontSize: 22, letterSpacing: 5, color: color.muted, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map((row, index) => (
          <div key={index} style={{ fontFamily: font.sans, fontSize: portrait ? 34 : 30, color: color.ink, backgroundColor: color.surface, borderRadius: 14, padding: '14px 20px' }}>
            {row}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18, fontFamily: font.sans, fontSize: portrait ? 26 : 22, color: color.muted }}>{note}</div>
    </div>
  );
}

function Chip({ text, at, tone }: { text: string; at: number; tone: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { portrait } = useLayout();
  const k = spring({ frame: frame - at, fps, config: { damping: 14 } });
  return (
    <div
      style={{
        fontFamily: font.sans,
        fontWeight: 500,
        fontSize: portrait ? 32 : 28,
        color: color.ink,
        backgroundColor: tone,
        borderRadius: 999,
        padding: '16px 30px',
        opacity: k,
        transform: `scale(${0.8 + 0.2 * k})`,
      }}
    >
      {text}
    </div>
  );
}

export function Anonymity({ duration, pace = 1 }: { duration: number; pace?: number }) {
  const frame = useCurrentFrame();
  const { portrait } = useLayout();
  const exit = useExit(duration);
  const t = (value: number) => value * pace;
  const title = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const cut = interpolate(frame, [t(70), t(70) + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const link = (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: portrait ? 120 : 160, height: portrait ? 120 : 160 }}>
      <div
        style={{
          position: 'absolute',
          ...(portrait ? { top: 0, bottom: 0, width: 0, borderLeft: `6px dashed ${color.line}` } : { left: 0, right: 0, height: 0, borderTop: `6px dashed ${color.line}` }),
        }}
      />
      <div
        style={{
          width: 86,
          height: 86,
          borderRadius: '50%',
          backgroundColor: color.mood[0],
          color: '#fff',
          fontFamily: font.sans,
          fontWeight: 600,
          fontSize: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${cut})`,
        }}
      >
        ✕
      </div>
    </div>
  );

  return (
    <AbsoluteFill style={{ opacity: exit, alignItems: 'center', justifyContent: 'center', padding: portrait ? '140px 60px' : '0 120px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: portrait ? 50 : 46 }}>
        <div style={{ textAlign: 'center', opacity: title }}>
          <div style={{ fontFamily: font.sans, fontWeight: 600, fontSize: portrait ? 26 : 22, letterSpacing: 6, color: color.accent, textTransform: 'uppercase' }}>
            Le cœur du projet
          </div>
          <div style={{ marginTop: 22, fontFamily: font.serif, fontSize: portrait ? 88 : 84, letterSpacing: -2, color: color.ink }}>
            L’anonymat, <Highlight tone={color.marker.violet} at={t(14)}>by design.</Highlight>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: portrait ? 'column' : 'row', alignItems: 'center' }}>
          <Card
            at={t(22)}
            tone={color.accent}
            label="Qui a répondu"
            rows={['alice@moodly.app · a répondu aujourd’hui']}
            note="Effacé dès le lendemain."
          />
          {link}
          <Card
            at={t(40)}
            tone={color.mood[3]}
            label="Ce qui a été répondu"
            rows={['Équipe Produit · 4 / 5 · Ambiance d’équipe']}
            note="Ni nom, ni heure : impossible de relier."
          />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 18, maxWidth: portrait ? 940 : 1600 }}>
          <Chip at={t(120)} tone={color.marker.sun} text="Moins de 3 réponses : jour masqué" />
          <Chip at={t(145)} tone={color.marker.sky} text="Jamais la journée en cours" />
          <Chip at={t(170)} tone={color.marker.mint} text="Base fermée à tout accès extérieur" />
        </div>
      </div>
    </AbsoluteFill>
  );
}
