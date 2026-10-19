import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { Highlight } from '../components/Highlight';
import { useLayout } from '../layout';
import { color, font } from '../theme';
import { useExit } from './motion';

const LINES = [
  { at: 0, text: 'Comment va vraiment votre équipe ?' },
  { at: 40, text: 'Personne n’ose le dire au manager.' },
];

export function Problem({ duration }: { duration: number }) {
  const frame = useCurrentFrame();
  const { portrait } = useLayout();
  const exit = useExit(duration);
  const appear = (at: number) => interpolate(frame, [at, at + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const style = (at: number) => ({
    opacity: appear(at),
    transform: `translateY(${(1 - appear(at)) * 30}px)`,
  });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', padding: portrait ? '0 90px' : '0 160px', opacity: exit }}>
      <div style={{ fontFamily: font.serif, fontSize: portrait ? 92 : 96, lineHeight: 1.12, letterSpacing: -2.5, color: color.ink }}>
        {LINES.map((line) => (
          <div key={line.at} style={{ ...style(line.at), marginBottom: portrait ? 40 : 28, color: line.at === 0 ? color.ink : color.muted }}>
            {line.text}
          </div>
        ))}
        <div style={style(85)}>
          Moodly le mesure.{portrait ? <br /> : ' '}
          <Highlight tone={color.marker.mint} at={100}>
            Anonymement.
          </Highlight>
        </div>
      </div>
    </AbsoluteFill>
  );
}
