import { Text, View } from 'react-native';
import type { Question } from '@/api';
import { Chip } from './Chip';

const MAX_MULTI = 3;

type Props = {
  question: Question;
  selected: number[];
  onChange: (optionIds: number[]) => void;
};

// Une question du questionnaire adaptatif : choix unique ou multiple (3 max)
export function QuestionCard({ question, selected, onChange }: Props) {
  const single = question.kind === 'single';

  const toggle = (optionId: number) => {
    if (selected.includes(optionId)) {
      onChange(selected.filter((id) => id !== optionId));
    } else if (single) {
      onChange([optionId]);
    } else {
      onChange([...selected, optionId]);
    }
  };

  return (
    <View>
      <Text className="font-sans-medium text-[15px] text-ink">{question.label}</Text>
      <Text className="mt-1 font-sans text-xs text-ink/50">
        {single ? 'Une seule réponse' : `Plusieurs réponses possibles · ${MAX_MULTI} max`}
      </Text>
      <View className="mt-3 flex-row flex-wrap gap-2">
        {question.options.map((option) => {
          const isSelected = selected.includes(option.id);
          return (
            <Chip
              key={option.id}
              label={option.label}
              selected={isSelected}
              disabled={!isSelected && !single && selected.length >= MAX_MULTI}
              onPress={() => toggle(option.id)}
            />
          );
        })}
      </View>
    </View>
  );
}
