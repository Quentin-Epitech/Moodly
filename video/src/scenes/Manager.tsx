import { AbsoluteFill } from 'remotion';
import { Caption } from '../components/Caption';
import { Highlight } from '../components/Highlight';
import { Stage } from '../components/Stage';
import { color } from '../theme';
import { PlacedLaptop, PlacedPhone } from './devices';
import { useExit } from './motion';

export function Manager({ duration }: { duration: number }) {
  const exit = useExit(duration);
  return (
    <AbsoluteFill>
      <Stage>
        <PlacedLaptop
          duration={duration}
          screens={[
            { file: 'desktop-manager', at: 0 },
            { file: 'desktop-chart', at: 170 },
          ]}
          landscape={{ x: 0.85, y: 0.16, scale: 0.8, rotY: -0.22, rotX: 0.3, z: -0.3 }}
          portrait={{ x: 0, y: 0.1, scale: 0.52, rotY: -0.14, rotX: 0.3, z: -0.3 }}
        />
        <PlacedPhone
          duration={duration}
          delay={20}
          phase={0.8}
          screens={[
            { file: 'manager', at: 0 },
            { file: 'weekly', at: 190 },
          ]}
          landscape={{ x: 2.38, y: -0.3, scale: 0.7, rotY: -0.3, z: 0.2 }}
          portrait={{ x: 0.05, y: -1.1, scale: 0.47, rotY: -0.22, z: 0.2 }}
        />
      </Stage>
      <div style={{ opacity: exit }}>
        <Caption
          kicker="Le manager"
          steps={[
            {
              at: 0,
              title: (
                <>
                  Des tendances, <Highlight tone={color.marker.violet} at={12}>jamais une personne.</Highlight>
                </>
              ),
              subtitle: 'Moyennes par jour, raisons les plus citées, alerte quand le moral baisse.',
            },
            {
              at: 180,
              title: 'Puis une action.',
              subtitle: 'Charge et stress chaque semaine ; le manager publie ce qu’il change, toute l’équipe le voit.',
            },
          ]}
        />
      </div>
    </AbsoluteFill>
  );
}
