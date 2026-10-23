import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { errorMessage, MIN_PASSWORD_LENGTH } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { homeHref } from '@/auth/routes';
import { Button } from '@/components/Button';
import { ErrorMessage } from '@/components/ErrorMessage';
import { LogoutButton } from '@/components/LogoutButton';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { TopBar } from '@/components/TopBar';
import { Body, Display, MicroLabel } from '@/components/Typography';
import palette from '@/theme/palette';

// Changement de mot de passe : imposé à la première connexion (mot de passe
// provisoire), accessible ensuite depuis le menu du compte.
export default function PasswordScreen() {
  const { status, user, onboardingDone, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (status === 'loading') {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={palette.ink} />
        </View>
      </Screen>
    );
  }
  if (status === 'signedOut' || !user) return <Redirect href="/login" />;

  const forced = user.mustChangePassword;

  const submit = async () => {
    setError(null);
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Le nouveau mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.`);
      return;
    }
    if (newPassword !== confirmation) {
      setError('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }
    setSaving(true);
    try {
      const updated = await changePassword(currentPassword, newPassword);
      router.replace(homeHref(updated, onboardingDone));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <TopBar
        back={forced ? undefined : { label: 'Retour', onPress: () => router.replace(homeHref(user, onboardingDone)) }}
        right={<LogoutButton />}
      />

      <MicroLabel className="mt-10">{forced ? 'Première connexion' : 'Mon compte'}</MicroLabel>
      <Display className="mt-3">{forced ? 'Choisissez votre mot de passe.' : 'Changer de mot de passe.'}</Display>
      <Body className="mt-4">
        {forced
          ? 'Le mot de passe reçu est provisoire : remplacez-le par un mot de passe personnel avant de continuer.'
          : 'Vos autres sessions ouvertes (autres appareils) seront fermées.'}
      </Body>

      <View className="mt-8 gap-4">
        <TextField
          label={forced ? 'Mot de passe provisoire' : 'Mot de passe actuel'}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          textContentType="password"
          autoComplete="current-password"
        />
        <TextField
          label="Nouveau mot de passe"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          textContentType="newPassword"
          autoComplete="new-password"
          placeholder={`${MIN_PASSWORD_LENGTH} caractères minimum`}
        />
        <TextField
          label="Confirmer le nouveau mot de passe"
          value={confirmation}
          onChangeText={setConfirmation}
          secureTextEntry
          textContentType="newPassword"
          autoComplete="new-password"
          onSubmitEditing={() => void submit()}
          returnKeyType="done"
        />
        <ErrorMessage message={error} />
        <Button
          title="Enregistrer"
          onPress={() => void submit()}
          loading={saving}
          disabled={!currentPassword || !newPassword || !confirmation}
        />
      </View>
    </Screen>
  );
}
