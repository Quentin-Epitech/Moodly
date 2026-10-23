import { AbsoluteFill } from 'remotion';
import { Caption } from '../components/Caption';
import { Stage } from '../components/Stage';
import { PlacedLaptop, PlacedPhone } from './devices';
import { useExit } from './motion';

export function Direction({ duration }: { duration: number }) {
  const exit = useExit(duration);
  return (
    <AbsoluteFill>
      <Stage>
        <PlacedLaptop
          duration={duration}
          screens={[{ file: 'desktop-hr', at: 0 }]}
          landscape={{ x: 0.85, y: 0.16, scale: 0.8, rotY: -0.22, rotX: 0.3, z: -0.3 }}
          portrait={{ x: 0, y: 0.1, scale: 0.52, rotY: 0.14, rotX: 0.3, z: -0.3 }}
        />
        <PlacedPhone
          duration={duration}
          delay={16}
          screens={[{ file: 'hr-cases', at: 0 }]}
          landscape={{ x: 2.38, y: -0.3, scale: 0.7, rotY: -0.3, z: 0.2 }}
          portrait={{ x: -0.05, y: -1.1, scale: 0.47, rotY: 0.22, z: 0.2 }}
        />
      </Stage>
      <div style={{ opacity: exit }}>
        <Caption
          kicker="La direction et les RH"
          steps={[
            {
              at: 0,
              title: 'Toute l’entreprise. Personne en particulier.',
              subtitle: 'Les équipes en difficulté d’un coup d’œil, et les signalements qui ne doivent pas attendre.',
            },
          ]}
        />
      </div>
    </AbsoluteFill>
  );
}
