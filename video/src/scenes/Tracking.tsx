import { AbsoluteFill } from 'remotion';
import { Caption } from '../components/Caption';
import { Stage } from '../components/Stage';
import { PlacedPhone } from './devices';
import { useExit } from './motion';

export function Tracking({ duration }: { duration: number }) {
  const exit = useExit(duration);
  return (
    <AbsoluteFill>
      <Stage>
        <PlacedPhone
          duration={duration}
          screens={[{ file: 'suivi', at: 0 }]}
          landscape={{ x: 0.85, y: 0.05, scale: 1.22, rotY: -0.16, z: -0.3 }}
          portrait={{ x: -0.46, y: -0.55, scale: 0.86, rotY: 0.2 }}
        />
        <PlacedPhone
          duration={duration}
          delay={8}
          phase={1.5}
          screens={[{ file: 'conseils', at: 0 }]}
          landscape={{ x: 2.15, y: -0.12, scale: 1.22, rotY: -0.4, z: 0.2 }}
          portrait={{ x: 0.46, y: -0.68, scale: 0.86, rotY: -0.2, z: 0.2 }}
        />
      </Stage>
      <div style={{ opacity: exit }}>
        <Caption
          kicker="Pour soi"
          steps={[
            {
              at: 0,
              title: 'Son suivi reste sur son téléphone.',
              subtitle: 'Ses courbes à lui, jamais envoyées au serveur. Et des conseils, avec les bons contacts.',
            },
          ]}
        />
      </div>
    </AbsoluteFill>
  );
}
