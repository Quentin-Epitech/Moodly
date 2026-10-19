import { router } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { homeHref } from '@/auth/routes';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { TopBar } from '@/components/TopBar';
import { Body, Display, MicroLabel } from '@/components/Typography';

// Information des personnes (RGPD) : accessible sans être connecté
export default function PrivacyScreen() {
  const { user, onboardingDone } = useAuth();
  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace(user ? homeHref(user, onboardingDone) : '/login');
  };

  return (
    <Screen scroll>
      <TopBar back={{ label: 'Retour', onPress: back }} />

      <MicroLabel className="mt-10">Confidentialité</MicroLabel>
      <Display className="mt-3">{'Vos données,\nen clair.'}</Display>
      <Body className="mt-4">
        Moodly mesure le moral des équipes sans jamais savoir qui a répondu quoi. Voici exactement ce qui est
        enregistré, qui le voit et combien de temps.
      </Body>

      <Section index={1} title="Ce qui est enregistré">
        <Body tone="ink">
          Votre compte : email, équipe, rôle et mot de passe chiffré. Vos réponses du jour et vos bilans de la semaine :
          rattachés à votre équipe et à la date, jamais à votre nom. Pour empêcher une deuxième réponse, l'app note
          seulement que vous avez répondu aujourd'hui (ou cette semaine) ; cette trace est supprimée dès le lendemain
          (ou la semaine suivante).
        </Body>
      </Section>

      <Section index={2} title="Mon suivi : sur votre appareil">
        <Body tone="ink">
          Les graphiques de « Mon suivi » sont calculés à partir de vos réponses gardées uniquement sur votre téléphone
          ou votre navigateur. Elles ne sont jamais renvoyées au serveur avec votre identité. Vous pouvez les effacer à
          tout moment depuis « Mon suivi ».
        </Body>
      </Section>

      <Section index={3} title="Demandes et signalements">
        <Body tone="ink">
          Les demandes (demande d'action, difficulté avec un collègue ou avec votre manager, prise de contact) sont
          envoyées à votre nom, sauf si vous choisissez l'envoi anonyme quand il est proposé : votre nom n'est alors pas
          enregistré et seul un code de suivi permet de retrouver la conversation. Une difficulté avec votre manager est
          traitée par les RH et n'est jamais montrée à votre manager. Ces demandes n'ont aucun lien avec vos réponses du
          jour.
        </Body>
      </Section>

      <Section index={4} title="Qui voit quoi">
        <Body tone="ink">
          Votre manager voit des moyennes par jour et par semaine pour son équipe, et les demandes qui lui sont
          adressées. La direction voit les mêmes moyennes pour toutes les équipes, et les demandes adressées aux RH.
          Personne, pas même un administrateur de la base, ne peut retrouver votre réponse du jour ou votre bilan. Un
          jour ou une semaine avec trop peu de réponses n'est affiché à personne, et la période en cours n'apparaît
          jamais : elle s'affiche une fois close.
        </Body>
      </Section>

      <Section index={5} title="Combien de temps">
        <Body tone="ink">
          Les réponses anonymes, bilans et actions d'équipe sont conservés pendant la durée fixée par votre entreprise
          (13 mois par défaut). Une demande résolue est supprimée un an après sa résolution. Votre compte est supprimé à
          votre départ.
        </Body>
      </Section>

      <Section index={6} title="Vos droits">
        <Body tone="ink">
          Pour accéder à vos données de compte et à vos demandes, les corriger ou les faire supprimer, adressez-vous à
          votre service RH ou au délégué à la protection des données de votre entreprise. Vos réponses du jour et vos
          bilans ne peuvent pas vous être rendus ni supprimés un par un : ils ne sont plus rattachés à vous. C'est la
          contrepartie de l'anonymat.
        </Body>
      </Section>

      <Section index={7} title="Sécurité">
        <Body tone="ink">
          Connexion chiffrée (HTTPS), mots de passe hachés, sessions fermées à la déconnexion et au changement de mot de
          passe, compte verrouillé quelques minutes après plusieurs erreurs de mot de passe.
        </Body>
      </Section>
    </Screen>
  );
}
