import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from 'remotion';
import { Background } from './components/Background';
import { LogoMark } from './components/Logo';
import { useLayout } from './layout';
import { Anonymity } from './scenes/Anonymity';
import { Direction } from './scenes/Direction';
import { Employee } from './scenes/Employee';
import { Intro } from './scenes/Intro';
import { Manager } from './scenes/Manager';
import { Outro } from './scenes/Outro';
import { Problem } from './scenes/Problem';
import { Requests } from './scenes/Requests';
import { Tracking } from './scenes/Tracking';
import { useScreensReady } from './three/useScreenTexture';
import { color, font } from './theme';
import './theme';

// Montage (30 images par seconde)
const SCENES = [
  { name: 'Intro', duration: 150, Component: Intro },
  { name: 'Problème', duration: 180, Component: Problem },
  { name: 'Employé', duration: 600, Component: Employee },
  { name: 'Suivi', duration: 210, Component: Tracking },
  { name: 'Anonymat', duration: 300, Component: Anonymity },
  { name: 'Manager', duration: 360, Component: Manager },
  { name: 'Demandes', duration: 450, Component: Requests },
  { name: 'Direction', duration: 180, Component: Direction },
  { name: 'Fin', duration: 180, Component: Outro },
] as const;

export const TOTAL_FRAMES = SCENES.reduce((total, scene) => total + scene.duration, 0);

/** Petite marque en coin pendant les scènes de démonstration (entre `start` et `end`) */
export function Corner({ start, end }: { start: number; end: number }) {
  const frame = useCurrentFrame();
  const { portrait } = useLayout();
  const opacity = interpolate(frame, [start, start + 15, end - 15, end], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (portrait) return null;
  return (
    <div style={{ position: 'absolute', left: portrait ? 90 : 140, bottom: portrait ? 90 : 70, display: 'flex', alignItems: 'center', gap: 14, opacity }}>
      <LogoMark size={38} />
      <span style={{ fontFamily: font.sans, fontWeight: 600, fontSize: 28, color: color.ink, letterSpacing: -0.5 }}>Moodly</span>
    </div>
  );
}

export function MoodlyVideo() {
  const ready = useScreensReady();
  let from = 0;
  if (!ready) return <Background />;
  return (
    <AbsoluteFill>
      <Background />
      {SCENES.map(({ name, duration, Component }) => {
        const sequence = (
          <Sequence key={name} name={name} from={from} durationInFrames={duration}>
            <Component duration={duration} />
          </Sequence>
        );
        from += duration;
        return sequence;
      })}
      <Corner start={SCENES[0].duration + SCENES[1].duration} end={TOTAL_FRAMES - SCENES[SCENES.length - 1].duration} />
    </AbsoluteFill>
  );
}
