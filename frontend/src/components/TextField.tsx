import { TextInput, View, type TextInputProps } from 'react-native';
import { MicroLabel } from './Typography';

type Props = TextInputProps & { label?: string };

export function TextField({ label, className, ...inputProps }: Props) {
  return (
    <View>
      {label ? (
        <MicroLabel className="mb-2" importantForAccessibility="no" aria-hidden>
          {label}
        </MicroLabel>
      ) : null}
      <TextInput
        // Le libellé visible est aussi le nom lu par les lecteurs d'écran
        accessibilityLabel={label}
        placeholderTextColor="#19191966"
        className={`rounded-lg border border-line bg-white px-4 py-3.5 font-sans text-[15px] text-ink ${className ?? ''}`}
        {...inputProps}
      />
    </View>
  );
}
