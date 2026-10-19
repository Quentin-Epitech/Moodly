import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { ApiError } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { homeHref } from '@/auth/routes';
import { Button } from '@/components/Button';
import { ErrorMessage } from '@/components/ErrorMessage';
import { NumberedRow } from '@/components/NumberedRow';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { TopBar } from '@/components/TopBar';
import { Body, Display, Highlight, Hairline, MicroLabel } from '@/components/Typography';

export default function LoginScreen() {
  const { status, user, onboardingDone, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Une fois connecté (ici ou au lancement), on part directement au bon écran
  if (status === 'signedIn' && user) return <Redirect href={homeHref(user, onboardingDone)} />;

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TopBar />

        <View className="mt-14">
          <Display size="xl">
            {'Prenez le pouls\nde votre '}
            <Highlight>équipe</Highlight>.
          </Display>
          <Body className="mt-5 max-w-[320px]">
            Une question par jour. Des tendances pour les managers — jamais de réponse individuelle.
          </Body>
        </View>

        <View className="mt-10 gap-4">
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            placeholder="prenom@moodly.app"
          />
          <TextField
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            autoComplete="password"
            onSubmitEditing={() => void submit()}
            returnKeyType="go"
          />
          <ErrorMessage message={error} />
          <Button title="Se connecter" onPress={() => void submit()} loading={loading} disabled={!email || !password} />
        </View>

        {/* Panneau « pourquoi Moodly ? », en bas de l'écran */}
        <View className="mt-16">
          <Hairline />
          <MicroLabel className="mt-8">Pourquoi Moodly ?</MicroLabel>
          <Display size="md" className="mt-3">
            {"Le moral de l'équipe,\nsans jamais savoir qui."}
          </Display>
          <Body className="mt-4 text-sm leading-6">
            Les réponses sont enregistrées sans nom. Les managers voient des moyennes par jour et des tendances ; un
            jour avec moins de trois réponses n'est pas affiché du tout.
          </Body>
          <Hairline className="mt-8" />
          <View className="mt-3 gap-2">
            <NumberedRow index={1} label="Anonyme" />
            <NumberedRow index={2} label="Quotidien" />
            <NumberedRow index={3} label="Actionnable" />
          </View>
          <Link href="/confidentialite" className="mt-8 py-2">
            <Text className="font-sans text-sm text-ink/70 underline">Confidentialité : ce qui est enregistré</Text>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
