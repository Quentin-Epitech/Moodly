import type { ReactNode } from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useLayout } from '../layout';
import { color, font } from '../theme';

export type Step = { at: number; title: ReactNode; subtitle?: ReactNode };

function StepText({ step, next }: { step: Step; next?: Step }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { portrait } = useLayout();
  const enter = spring({ frame: frame - step.at, fps, config: { damping: 200 }, durationInFrames: 18 });
  const exit = next ? interpolate(frame, [next.at - 8, next.at], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  if (frame < step.at || (next && frame >= next.at)) return null;
  return (
    <div style={{ opacity: enter * exit, transform: `translateY(${(1 - enter) * 28}px)` }}>
      <div
        style={{
          fontFamily: font.serif,
          fontSize: portrait ? 86 : 78,
          lineHeight: 1.08,
          letterSpacing: -2,
          color: color.ink,
        }}
      >
        {step.title}
      </div>
      {step.subtitle && (
        <div
          style={{
            marginTop: portrait ? 28 : 26,
            fontFamily: font.sans,
            fontSize: portrait ? 38 : 32,
            lineHeight: 1.45,
            color: color.muted,
            maxWidth: portrait ? 900 : 700,
          }}
        >
          {step.subtitle}
        </div>
      )}
    </div>
  );
}

/** Bloc de texte d'une scène : une étiquette (« L'EMPLOYÉ ») et des étapes qui se succèdent */
export function Caption({ kicker, steps }: { kicker: string; steps: Step[] }) {
  const frame = useCurrentFrame();
  const { portrait } = useLayout();
  const kickerIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        position: 'absolute',
        ...(portrait
          ? { left: 90, right: 90, top: 150 }
          : { left: 140, width: 760, top: 290 }),
      }}
    >
      <div
        style={{
          fontFamily: font.sans,
          fontWeight: 600,
          fontSize: portrait ? 26 : 22,
          letterSpacing: 6,
          textTransform: 'uppercase',
          color: color.accent,
          marginBottom: portrait ? 30 : 26,
          opacity: kickerIn,
        }}
      >
        {kicker}
      </div>
      <div style={{ position: 'relative' }}>
        {steps.map((step, index) => (
          <StepText key={index} step={step} next={steps[index + 1]} />
        ))}
      </div>
    </div>
  );
}
