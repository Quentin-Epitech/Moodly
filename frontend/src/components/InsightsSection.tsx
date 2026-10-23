import { Text, View } from 'react-native';
import type { TeamInsights } from '@/api';
import { BarList } from './BarList';

const OPTIONS_SHOWN = 4;

// Réponses au questionnaire, cumulées sur la période (jamais par jour)
export function InsightsSection({ insights }: { insights: TeamInsights }) {
  const answered = insights.questions.filter((question) => question.responses > 0);

  if (answered.length === 0) {
    return <Text className="font-sans text-sm text-ink/50">Pas encore de précisions sur cette période.</Text>;
  }

  return (
    <View className="gap-8">
      {answered.map((question) => (
        <View key={question.id}>
          <Text className="font-sans-medium text-[15px] text-ink">{question.label}</Text>
          <Text className="mt-1 font-sans text-xs text-ink/50">
            {question.responses} réponse{question.responses > 1 ? 's' : ''}
          </Text>
          <View className="mt-4">
            <BarList
              items={question.options
                .filter((option) => option.count > 0)
                .slice(0, OPTIONS_SHOWN)
                .map((option) => ({ label: option.label, count: option.count, ratio: option.ratio }))}
            />
          </View>
        </View>
      ))}
      <Text className="font-sans text-xs leading-4 text-ink/50">
        Cumulé sur {insights.basedOnDays} jour{insights.basedOnDays > 1 ? 's' : ''} au-dessus du seuil (
        {insights.responses} réponses). Jamais détaillé par jour ni par personne.
      </Text>
    </View>
  );
}
