import { AbsoluteFill } from 'remotion';
import { Caption } from '../components/Caption';
import { Highlight } from '../components/Highlight';
import { Stage } from '../components/Stage';
import { color } from '../theme';
import { PlacedPhone } from './devices';
import { useExit } from './motion';

export const REQUEST_STEPS = [0, 150, 300];

export function Requests({ duration }: { duration: number }) {
  const exit = useExit(duration);
  return (
    <AbsoluteFill>
      <Stage>
        <PlacedPhone
          duration={duration}
          screens={[
            { file: 'report', at: 0 },
            { file: 'code', at: 80 },
            { file: 'slot', at: REQUEST_STEPS[1] },
            { file: 'meeting', at: REQUEST_STEPS[2] },
            { file: 'agenda', at: REQUEST_STEPS[2] + 80 },
          ]}
          landscape={{ x: 1.4, y: -0.02, scale: 1.45, rotY: -0.3 }}
          portrait={{ x: 0, y: -0.5, scale: 1.18, rotY: 0.12 }}
          phase={2}
        />
      </Stage>
      <div style={{ opacity: exit }}>
        <Caption
          kicker="Demandes et rendez-vous"
          steps={[
            {
              at: REQUEST_STEPS[0],
              title: 'Un problème ? On en parle.',
              subtitle: 'Au manager, ou aux RH s’il concerne le manager. Anonymement si besoin, avec un code de suivi.',
            },
            {
              at: REQUEST_STEPS[1],
              title: (
                <>
                  Un rendez-vous en <Highlight tone={color.marker.sun} at={REQUEST_STEPS[1] + 12}>trois gestes.</Highlight>
                </>
              ),
              subtitle: 'Un jour, une heure, un lieu. L’autre accepte ou refuse.',
            },
            {
              at: REQUEST_STEPS[2],
              title: 'Directement dans l’agenda.',
              subtitle: 'Outlook, Apple Calendar ou Google Agenda, avec un titre neutre qui ne révèle rien.',
            },
          ]}
        />
      </div>
    </AbsoluteFill>
  );
}
