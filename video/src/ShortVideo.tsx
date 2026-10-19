import { AbsoluteFill, Sequence } from 'remotion';
import { Caption } from './components/Caption';
import { Background } from './components/Background';
import { Highlight } from './components/Highlight';
import { Stage } from './components/Stage';
import { Anonymity } from './scenes/Anonymity';
import { PlacedLaptop, PlacedPhone } from './scenes/devices';
import { Intro } from './scenes/Intro';
import { useExit } from './scenes/motion';
import { Outro } from './scenes/Outro';
import { useScreensReady } from './three/useScreenTexture';
import { Corner } from './Video';
import { color } from './theme';

// Montage court (30 s) : l'essentiel, pour les réseaux sociaux ou l'ouverture de la soutenance.

const NB = ' ';
const PHONE = { landscape: { x: 1.4, y: -0.02, scale: 1.45, rotY: -0.3 }, portrait: { x: 0, y: -0.5, scale: 1.18, rotY: -0.12 } };

function Employee({ duration }: { duration: number }) {
  const exit = useExit(duration);
  return (
    <AbsoluteFill>
      <Stage>
        <PlacedPhone
          duration={duration}
          screens={[
            { file: 'home', at: 0 },
            { file: 'mood', at: 60 },
            { file: 'merci', at: 125 },
          ]}
          landscape={PHONE.landscape}
          portrait={PHONE.portrait}
        />
      </Stage>
      <div style={{ opacity: exit }}>
        <Caption
          kicker="L'employé"
          steps={[
            {
              at: 0,
              title: (
                <>
                  Une question <Highlight tone={color.marker.sun} at={8}>par jour.</Highlight>
                </>
              ),
              subtitle: `Trente secondes${NB}: une humeur, quelques raisons.`,
            },
            {
              at: 125,
              title: (
                <>
                  Envoyé <Highlight tone={color.marker.mint} at={133}>sans son nom.</Highlight>
                </>
              ),
              subtitle: 'Le manager ne voit que la moyenne de l’équipe.',
            },
          ]}
        />
      </div>
    </AbsoluteFill>
  );
}

function Manager({ duration }: { duration: number }) {
  const exit = useExit(duration);
  return (
    <AbsoluteFill>
      <Stage>
        <PlacedLaptop
          duration={duration}
          screens={[{ file: 'desktop-manager', at: 0 }]}
          landscape={{ x: 0.85, y: 0.16, scale: 0.8, rotY: -0.22, rotX: 0.3, z: -0.3 }}
          portrait={{ x: 0, y: 0.1, scale: 0.52, rotY: -0.14, rotX: 0.3, z: -0.3 }}
        />
        <PlacedPhone
          duration={duration}
          delay={12}
          phase={0.8}
          screens={[{ file: 'weekly', at: 0 }]}
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
                  Des tendances, <Highlight tone={color.marker.violet} at={10}>jamais une personne.</Highlight>
                </>
              ),
              subtitle: 'Alertes, charge et stress, puis une action pour l’équipe.',
            },
          ]}
        />
      </div>
    </AbsoluteFill>
  );
}

function Requests({ duration }: { duration: number }) {
  const exit = useExit(duration);
  return (
    <AbsoluteFill>
      <Stage>
        <PlacedPhone
          duration={duration}
          phase={2}
          screens={[
            { file: 'code', at: 0 },
            { file: 'meeting', at: 85 },
            { file: 'agenda', at: 135 },
          ]}
          landscape={PHONE.landscape}
          portrait={{ ...PHONE.portrait, rotY: 0.12 }}
        />
      </Stage>
      <div style={{ opacity: exit }}>
        <Caption
          kicker="Demandes et rendez-vous"
          steps={[
            {
              at: 0,
              title: `Un problème${NB}? On en parle.`,
              subtitle: 'Au manager, ou aux RH. Anonymement si besoin.',
            },
            {
              at: 85,
              title: (
                <>
                  Le rendez-vous, <Highlight tone={color.marker.sun} at={95}>direct dans l’agenda.</Highlight>
                </>
              ),
              subtitle: 'Outlook, Apple Calendar ou Google Agenda.',
            },
          ]}
        />
      </div>
    </AbsoluteFill>
  );
}

const SCENES = [
  { name: 'Intro', duration: 75, render: (d: number) => <Intro duration={d} pace={0.6} /> },
  { name: 'Employé', duration: 210, render: (d: number) => <Employee duration={d} /> },
  { name: 'Anonymat', duration: 165, render: (d: number) => <Anonymity duration={d} pace={0.55} /> },
  { name: 'Manager', duration: 150, render: (d: number) => <Manager duration={d} /> },
  { name: 'Demandes', duration: 180, render: (d: number) => <Requests duration={d} /> },
  { name: 'Fin', duration: 120, render: () => <Outro /> },
];

export const SHORT_FRAMES = SCENES.reduce((total, scene) => total + scene.duration, 0);

export function MoodlyShort() {
  const ready = useScreensReady();
  if (!ready) return <Background />;
  let from = 0;
  return (
    <AbsoluteFill>
      <Background />
      {SCENES.map((scene) => {
        const sequence = (
          <Sequence key={scene.name} name={scene.name} from={from} durationInFrames={scene.duration}>
            {scene.render(scene.duration)}
          </Sequence>
        );
        from += scene.duration;
        return sequence;
      })}
      <Corner start={SCENES[0].duration} end={SHORT_FRAMES - SCENES[SCENES.length - 1].duration} />
    </AbsoluteFill>
  );
}
