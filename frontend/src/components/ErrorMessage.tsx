import { Text } from 'react-native';

export function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Text accessibilityRole="alert" className="font-sans text-sm text-danger">
      {message}
    </Text>
  );
}
