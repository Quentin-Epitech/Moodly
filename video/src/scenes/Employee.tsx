import { AbsoluteFill } from 'remotion';
import { Caption } from '../components/Caption';
import { Highlight } from '../components/Highlight';
import { Stage } from '../components/Stage';
import { color } from '../theme';
import { PlacedPhone } from './devices';
import { useExit } from './motion';

export const EMPLOYEE_STEPS = [0, 150, 300, 450];

export function Employee({ duration }: { duration: number }) {
  const exit = useExit(duration);
  return (
    <AbsoluteFill>
      <Stage>
        <PlacedPhone
          duration={duration}
          screens={[
            { file: 'home', at: 0 },
            { file: 'mood', at: EMPLOYEE_STEPS[1] },
            { file: 'merci', at: EMPLOYEE_STEPS[2] },
            { file: 'bilan', at: EMPLOYEE_STEPS[3] },
          ]}
          landscape={{ x: 1.4, y: -0.02, scale: 1.45, rotY: -0.3 }}
          portrait={{ x: 0, y: -0.5, scale: 1.18, rotY: -0.12 }}
        />
      </Stage>
      <div style={{ opacity: exit }}>
        <Caption
          kicker="L'employé"
          steps={[
            {
              at: EMPLOYEE_STEPS[0],
              title: (
                <>
                  Une question <Highlight tone={color.marker.sun} at={10}>par jour.</Highlight>
                </>
              ),
              subtitle: 'Trente secondes : une humeur de 1 à 5, sans son nom.',
            },
            {
              at: EMPLOYEE_STEPS[1],
              title: 'Ce qui pèse, ce qui aide.',
              subtitle: 'Jusqu’à trois raisons et quelques précisions, si on le souhaite.',
            },
            {
              at: EMPLOYEE_STEPS[2],
              title: (
                <>
                  Envoyé <Highlight tone={color.marker.mint} at={EMPLOYEE_STEPS[2] + 10}>sans son nom.</Highlight>
                </>
              ),
              subtitle: 'Et l’action décidée par le manager s’affiche juste en dessous.',
            },
            {
              at: EMPLOYEE_STEPS[3],
              title: 'Le bilan du vendredi.',
              subtitle: 'Charge de travail et stress : trois questions, une fois par semaine.',
            },
          ]}
        />
      </div>
    </AbsoluteFill>
  );
}
