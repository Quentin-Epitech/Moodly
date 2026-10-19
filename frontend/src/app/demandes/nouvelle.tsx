import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { api, errorMessage, type CaseRecipient, type CaseType, type CaseTypeInfo } from '@/api';
import { useGuard } from '@/auth/useGuard';
import { AccountMenu } from '@/components/AccountMenu';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ErrorMessage } from '@/components/ErrorMessage';
import { NumberedRow } from '@/components/NumberedRow';
import { RoleNav } from '@/components/RoleNav';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { TextField } from '@/components/TextField';
import { Toggle } from '@/components/Toggle';
import { TopBar } from '@/components/TopBar';
import { Body, Display, MicroLabel } from '@/components/Typography';
import { rememberAnonymousCase } from '@/lib/anonymousCases';
import palette from '@/theme/palette';

const RECIPIENTS: { value: CaseRecipient; label: string }[] = [
  { value: 'MANAGER', label: 'Mon manager' },
  { value: 'HR', label: 'Les RH' },
];

// Nouvelle demande : choisir le type, puis écrire ; le destinataire découle du type
export default function NewCaseScreen() {
  const user = useGuard('EMPLOYEE');
  const params = useLocalSearchParams<{ type?: string }>();
  const [types, setTypes] = useState<CaseTypeInfo[] | null>(null);
  const [type, setType] = useState<CaseType | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<CaseRecipient | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [created, setCreated] = useState<{ id: number; token: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    api
      .getCaseTypes()
      .then((list) => {
        setTypes(list);
        const preset = list.find((t) => t.type === params.type);
        if (preset) setType(preset.type);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [user, params.type]);

  if (!user) return null;

  const config = types?.find((t) => t.type === type) ?? null;
  const destination = config
    ? config.recipient === 'CHOICE'
      ? recipient === 'HR'
        ? 'Les RH'
        : recipient === 'MANAGER'
          ? 'Votre manager'
          : null
      : config.recipient === 'HR'
        ? 'Les RH — jamais montré à votre manager'
        : 'Votre manager'
    : null;
  const ready =
    config &&
    category &&
    (config.recipient !== 'CHOICE' || recipient) &&
    subject.trim().length >= 3 &&
    message.trim().length >= 10;

  const choose = (next: CaseType) => {
    setType(next);
    setCategory(null);
    setRecipient(null);
    setAnonymous(false);
  };

  const submit = async () => {
    if (!config || !category) return;
    setSending(true);
    setError(null);
    try {
      const res = await api.createCase({
        type: config.type,
        category,
        subject: subject.trim(),
        message: message.trim(),
        anonymous: config.anonymousAllowed && anonymous,
        recipient: config.recipient === 'CHOICE' ? (recipient ?? undefined) : undefined,
      });
      if (res.accessToken) {
        await rememberAnonymousCase(user.id, { id: res.case.id, token: res.accessToken });
        setCreated({ id: res.case.id, token: res.accessToken });
      } else {
        router.replace({ pathname: '/demandes/[id]', params: { id: String(res.case.id) } });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const top = (
    <TopBar back={{ label: 'Demandes', onPress: () => router.replace('/demandes') }} right={<AccountMenu />} />
  );

  // Signalement anonyme envoyé : le code de suivi n'est affiché qu'une fois
  if (created) {
    return (
      <Screen scroll footer={<RoleNav />}>
        {top}
        <MicroLabel className="mt-10">Signalement anonyme envoyé</MicroLabel>
        <Display className="mt-3">Gardez ce code.</Display>
        <Body className="mt-4">
          Votre nom n'a pas été enregistré. Ce code de suivi est le seul moyen de retrouver la conversation : il est
          gardé sur cet appareil, notez-le aussi si vous changez de téléphone.
        </Body>
        <View className="mt-8 bg-surface px-5 py-6">
          <MicroLabel>Code de suivi</MicroLabel>
          <Text selectable className="mt-3 font-serif text-[26px] tracking-[1px] text-ink">
            {created.token}
          </Text>
        </View>
        <View className="mt-8">
          <Button
            title="Voir la conversation"
            onPress={() => router.replace({ pathname: '/demandes/[id]', params: { id: String(created.id) } })}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll footer={<RoleNav />}>
      {top}
      <MicroLabel className="mt-10">Nouvelle demande</MicroLabel>
      <Display className="mt-3">{config ? config.label : 'De quoi s’agit-il ?'}</Display>
      <Body className="mt-4">{config ? config.description : 'Choisissez le type de demande.'}</Body>

      {!types ? (
        <View className="mt-16 items-center">
          {error ? <ErrorMessage message={error} /> : <ActivityIndicator color={palette.ink} />}
        </View>
      ) : !config ? (
        <View className="mt-8 gap-2">
          {types.map((t, index) => (
            <NumberedRow key={t.type} index={index + 1} label={t.label} onPress={() => choose(t.type)} />
          ))}
        </View>
      ) : (
        <>
          <Section index={1} title="Catégorie">
            <View className="flex-row flex-wrap gap-2">
              {config.categories.map((c) => (
                <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
              ))}
            </View>
            {category === 'Comportement inapproprié' && (
              <Text className="mt-4 font-sans text-xs leading-5 text-ink/70">
                En cas de harcèlement ou de comportement grave, vous pouvez aussi contacter le référent harcèlement, le
                CSE ou la médecine du travail. Voir la page Conseils.
              </Text>
            )}
          </Section>

          {config.recipient === 'CHOICE' && (
            <Section index={2} title="À qui ?">
              <View className="flex-row flex-wrap gap-2">
                {RECIPIENTS.map((r) => (
                  <Chip
                    key={r.value}
                    label={r.label}
                    selected={recipient === r.value}
                    onPress={() => setRecipient(r.value)}
                  />
                ))}
              </View>
            </Section>
          )}

          <Section
            index={config.recipient === 'CHOICE' ? 3 : 2}
            title="Votre message"
            hint={destination ? `Destinataire : ${destination}` : undefined}
          >
            <View className="gap-4">
              <TextField
                label="Objet"
                value={subject}
                onChangeText={setSubject}
                maxLength={120}
                placeholder="En quelques mots"
              />
              <TextField
                label="Message"
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={2000}
                className="min-h-[140px]"
                textAlignVertical="top"
                placeholder="Décrivez la situation : les faits, depuis quand, ce qui vous aiderait."
              />
              {config.anonymousAllowed && (
                <Toggle
                  label="Envoyer anonymement"
                  hint="Votre nom ne sera pas enregistré. Attention : le contenu du message peut suffire à vous reconnaître. Vous recevrez un code de suivi pour retrouver la conversation."
                  value={anonymous}
                  onChange={setAnonymous}
                />
              )}
              {!anonymous && (
                <Text className="font-sans text-xs leading-5 text-ink/50">
                  Cette demande est envoyée à votre nom. Elle n'a aucun lien avec vos réponses du jour, qui restent
                  anonymes.
                </Text>
              )}
            </View>
          </Section>

          <View className="mt-10 gap-3">
            <ErrorMessage message={error} />
            <Button title="Envoyer" onPress={() => void submit()} loading={sending} disabled={!ready} />
            <Button title="Changer de type" variant="ghost" onPress={() => setType(null)} />
          </View>
        </>
      )}
    </Screen>
  );
}
