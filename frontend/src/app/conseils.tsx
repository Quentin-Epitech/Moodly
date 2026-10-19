import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useGuard } from '@/auth/useGuard';
import { AccountMenu } from '@/components/AccountMenu';
import { NumberedRow } from '@/components/NumberedRow';
import { RoleNav } from '@/components/RoleNav';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { TopBar } from '@/components/TopBar';
import { Body, Display, Highlight, MicroLabel } from '@/components/Typography';
import { ADVICE } from '@/content/advice';

// Conseils pratiques et contacts utiles, pour tous les rôles
// Une couleur pastel par thème, pour que la page respire
const TINTS = ['bg-sun', 'bg-peach', 'bg-sky', 'bg-mint', 'bg-accent-soft', 'bg-mood-soft-1'];

export default function AdviceScreen() {
  const user = useGuard();
  if (!user) return null;
  const employee = user.role === 'EMPLOYEE';

  return (
    <Screen scroll footer={<RoleNav />}>
      <TopBar right={<AccountMenu />} />
      <MicroLabel className="mt-10">Conseils</MicroLabel>
      <Display className="mt-3">
        {'Prendre soin\nde '}
        <Highlight color="mint">soi</Highlight> au travail.
      </Display>
      <Body className="mt-4">
        Des repères simples pour la charge, le stress et les relations au travail, et les bonnes personnes à contacter.
      </Body>

      {ADVICE.map((section, index) => (
        <Section key={section.title} index={index + 1} title={section.title}>
          <View className={`rounded-lg px-5 py-5 ${TINTS[index % TINTS.length]}`}>
            <Text className="font-sans-medium text-[15px] leading-6 text-ink">{section.intro}</Text>
            <View className="mt-4 gap-3">
              {section.tips.map((tip) => (
                <View key={tip} className="flex-row gap-3">
                  <Text className="font-sans text-[15px] leading-6 text-ink/40">—</Text>
                  <Text className="flex-1 font-sans text-[15px] leading-6 text-ink/80">{tip}</Text>
                </View>
              ))}
            </View>
          </View>
          {employee && section.action && (
            <View className="mt-5">
              <NumberedRow
                index={1}
                label={section.action.label}
                onPress={() => router.push({ pathname: '/demandes/nouvelle', params: { type: section.action!.type } })}
              />
            </View>
          )}
        </Section>
      ))}

      <Text className="mt-12 font-sans text-xs leading-5 text-ink/50">
        Ces conseils sont une information générale. Ils ne remplacent ni un avis médical, ni l'accompagnement de votre
        médecin, de la médecine du travail ou de vos RH.
      </Text>
    </Screen>
  );
}
