import { Link, router } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { homeHref } from '@/auth/routes';
import { useGuard } from '@/auth/useGuard';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { TopBar } from '@/components/TopBar';
import { Body, Display, MicroLabel } from '@/components/Typography';

// Affiché une seule fois, à la première connexion : ce que chacun voit et ne voit
// pas, selon son rôle.
export default function OnboardingScreen() {
  const user = useGuard();
  const { completeOnboarding } = useAuth();

  if (!user) return null;

  const threshold = user.anonymityThreshold;

  const done = async () => {
    await completeOnboarding();
    router.replace(homeHref(user, true));
  };

  return (
    <Screen scroll>
      <TopBar />

      <MicroLabel className="mt-10">Avant de commencer</MicroLabel>
      {user.role === 'EMPLOYEE' ? <EmployeeIntro threshold={threshold} /> : null}
      {user.role === 'MANAGER' ? <ManagerIntro threshold={threshold} /> : null}
      {user.role === 'HR' ? <HrIntro threshold={threshold} /> : null}

      <Link href="/confidentialite" className="mt-8 py-2">
        <Text className="font-sans text-sm text-ink/70 underline">En savoir plus sur vos données</Text>
      </Link>

      <View className="mt-10">
        <Button title="C'est compris" onPress={() => void done()} />
      </View>
    </Screen>
  );
}

type IntroProps = { threshold: number };

function EmployeeIntro({ threshold }: IntroProps) {
  return (
    <>
      <Display className="mt-3">{"Ce que votre manager voit.\nEt ce qu'il ne voit pas."}</Display>
      <Body className="mt-5">
        Moodly prend le pouls de l'équipe en une question par jour. Les managers voient des tendances pour agir à temps
        — jamais des réponses individuelles.
      </Body>
      <Section index={1} title="Ce qu'il voit">
        <Body tone="ink">
          Une moyenne par jour pour toute l'équipe, le nombre de réponses et les raisons les plus citées.
        </Body>
      </Section>
      <Section index={2} title="Ce qu'il ne voit pas">
        <Body tone="ink">
          Votre réponse. Votre nom n'est jamais enregistré avec votre note : la base de données elle-même ne sait pas
          qui a répondu quoi. Et un jour avec moins de {threshold} réponses n'est pas affiché du tout. La journée en
          cours n'apparaît jamais : votre manager voit les tendances le lendemain.
        </Body>
      </Section>
      <Section index={3} title="Une question par jour">
        <Body tone="ink">
          Trente secondes, pas plus : une note de 1 à 5, jusqu'à trois raisons, et quelques précisions si vous le
          souhaitez. Une fois par semaine, un bilan de trois questions sur votre charge et votre stress.
        </Body>
      </Section>
      <Section index={4} title="Si ça ne va pas">
        <Body tone="ink">
          Dans « Demandes », vous pouvez demander un changement à votre manager, signaler une difficulté (aux RH si elle
          concerne votre manager) et convenir d'un rendez-vous, à ajouter à votre agenda.
        </Body>
      </Section>
    </>
  );
}

function ManagerIntro({ threshold }: IntroProps) {
  return (
    <>
      <Display className="mt-3">{'Ce que vous verrez.\nEt ce que personne ne voit.'}</Display>
      <Body className="mt-5">
        Moodly vous donne le pouls de votre équipe pour agir à temps. Vous voyez des tendances, jamais une personne.
      </Body>
      <Section index={1} title="Ce que vous voyez">
        <Body tone="ink">
          La moyenne de l'équipe jour après jour, les raisons les plus citées, la charge et le stress de chaque semaine,
          et une alerte quand le moral baisse.
        </Body>
      </Section>
      <Section index={2} title="Ce que personne ne voit">
        <Body tone="ink">
          La réponse d'une personne : elle n'est jamais enregistrée avec son nom. Un jour avec moins de {threshold}{' '}
          réponses n'est pas affiché, et la journée en cours n'apparaît que le lendemain. Un signalement anonyme reste
          anonyme, et un signalement vous concernant va aux RH, pas à vous.
        </Body>
      </Section>
      <Section index={3} title="Ce que l'équipe attend">
        <Body tone="ink">
          Qu'une alerte soit suivie d'une action : publiez ce que vous changez, datez un point d'équipe si besoin.
          Répondez aux demandes et proposez un rendez-vous : chacun l'ajoute à son agenda.
        </Body>
      </Section>
    </>
  );
}

function HrIntro({ threshold }: IntroProps) {
  return (
    <>
      <Display className="mt-3">{"Toute l'entreprise.\nPersonne en particulier."}</Display>
      <Body className="mt-5">
        Vous comparez le moral des équipes pour repérer celles qui ont besoin d'aide, sans jamais voir une réponse
        individuelle.
      </Body>
      <Section index={1} title="Ce que vous voyez">
        <Body tone="ink">
          Le moral, la charge et le stress de chaque équipe, les alertes, et le détail d'une équipe en lecture seule.
        </Body>
      </Section>
      <Section index={2} title="Ce que personne ne voit">
        <Body tone="ink">
          La réponse d'une personne, les jours avec moins de {threshold} réponses et la journée en cours. La même règle
          s'applique à la direction qu'aux managers.
        </Body>
      </Section>
      <Section index={3} title="Votre rôle">
        <Body tone="ink">
          Les signalements concernant un manager vous sont adressés, jamais au manager concerné, ainsi que les demandes
          d'échange. Répondez-y et proposez un rendez-vous si besoin.
        </Body>
      </Section>
    </>
  );
}
