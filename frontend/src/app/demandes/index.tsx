import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { api, errorMessage, type CaseSummary } from '@/api';
import { useGuard } from '@/auth/useGuard';
import { AccountMenu } from '@/components/AccountMenu';
import { Button } from '@/components/Button';
import { CaseRow } from '@/components/CaseRow';
import { ErrorMessage } from '@/components/ErrorMessage';
import { RoleNav } from '@/components/RoleNav';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { TextField } from '@/components/TextField';
import { TopBar } from '@/components/TopBar';
import { UpcomingAgenda } from '@/components/UpcomingAgenda';
import { Body, Display, Highlight, MicroLabel } from '@/components/Typography';
import { formatAccessCode, listAnonymousCases, rememberAnonymousCase } from '@/lib/anonymousCases';
import palette from '@/theme/palette';

type Filter = 'active' | 'resolved';

const open = (id: number) => router.push({ pathname: '/demandes/[id]', params: { id: String(id) } });

function CaseList({ items, empty }: { items: CaseSummary[]; empty: string }) {
  if (items.length === 0) return <Text className="font-sans text-sm text-ink/50">{empty}</Text>;
  return (
    <View className="gap-2">
      {items.map((item) => (
        <CaseRow key={item.id} item={item} onPress={() => open(item.id)} />
      ))}
    </View>
  );
}

// Demandes & signalements : ce que j'ai envoyé (employé) ou ce que je traite (manager, RH)
export default function CasesScreen() {
  const user = useGuard();
  const [cases, setCases] = useState<CaseSummary[] | null>(null);
  const [anonymous, setAnonymous] = useState<CaseSummary[]>([]);
  const [filter, setFilter] = useState<Filter>('active');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCases = useCallback(async () => {
    if (!user) return null;
    const nominative = await api.listCases();
    let anonymousCases: CaseSummary[] = [];
    if (user.role === 'EMPLOYEE') {
      const refs = await listAnonymousCases(user.id);
      if (refs.length > 0) anonymousCases = await api.lookupCases(refs.map((ref) => ref.token));
    }
    return { nominative, anonymousCases };
  }, [user]);

  const apply = (result: { nominative: CaseSummary[]; anonymousCases: CaseSummary[] } | null) => {
    if (!result) return;
    setCases(result.nominative);
    setAnonymous(result.anonymousCases);
    setError(null);
  };

  const load = async () => {
    try {
      apply(await fetchCases());
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await fetchCases();
        if (!cancelled) apply(result);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchCases]);

  if (!user) return null;
  const employee = user.role === 'EMPLOYEE';

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const findByCode = async () => {
    setCodeError(null);
    const token = formatAccessCode(code);
    try {
      const [found] = await api.lookupCases([token]);
      if (!found) {
        setCodeError('Aucun signalement ne correspond à ce code.');
        return;
      }
      await rememberAnonymousCase(user.id, { id: found.id, token });
      setCode('');
      await load();
    } catch (err) {
      setCodeError(errorMessage(err));
    }
  };

  const active = (cases ?? []).filter((c) => c.status !== 'RESOLVED');
  const resolved = (cases ?? []).filter((c) => c.status === 'RESOLVED');

  return (
    <Screen
      scroll
      footer={<RoleNav />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
    >
      <TopBar right={<AccountMenu />} />
      <MicroLabel className="mt-10">
        {employee ? 'Mes demandes' : user.role === 'HR' ? 'Ressources humaines' : `Équipe ${user.teamName}`}
      </MicroLabel>
      <Display className="mt-3">
        {employee ? (
          <>
            {'Demandes et\n'}
            <Highlight color="sky">signalements</Highlight>.
          </>
        ) : (
          <>
            Demandes <Highlight color="sky">reçues</Highlight>.
          </>
        )}
      </Display>
      <Body className="mt-4">
        {employee
          ? 'Demander un changement à votre manager, signaler une difficulté avec un collègue ou avec votre manager, ou demander un échange. Ces demandes sont séparées de vos réponses du jour, qui restent anonymes.'
          : user.role === 'HR'
            ? 'Signalements concernant un manager (jamais montrés au manager concerné) et demandes d’échange adressées aux RH, toutes équipes.'
            : "Demandes d'action, difficultés entre collègues et demandes d'échange de votre équipe."}
      </Body>

      {employee && (
        <View className="mt-7">
          <Button title="Nouvelle demande" onPress={() => router.push('/demandes/nouvelle')} />
        </View>
      )}

      <UpcomingAgenda className="mt-8" />

      {error && (
        <View className="mt-5">
          <ErrorMessage message={error} />
        </View>
      )}

      {!cases ? (
        !error && (
          <View className="mt-16 items-center">
            <ActivityIndicator color={palette.ink} />
          </View>
        )
      ) : employee ? (
        <>
          <Section index={1} title="Mes demandes" hint="Envoyées à votre nom">
            <CaseList items={cases} empty="Aucune demande pour l'instant." />
          </Section>
          <Section
            index={2}
            title="Mes signalements anonymes"
            hint="Retrouvés grâce aux codes de suivi gardés sur cet appareil"
          >
            <CaseList items={anonymous} empty="Aucun signalement anonyme sur cet appareil." />
            <View className="mt-6 gap-3">
              <TextField
                label="Retrouver avec un code de suivi"
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="ABCD-EFGH-JKLM-NPQR-STUV"
              />
              <ErrorMessage message={codeError} />
              <Button
                title="Retrouver"
                variant="secondary"
                onPress={() => void findByCode()}
                disabled={formatAccessCode(code).replace(/-/g, '').length < 20}
              />
            </View>
          </Section>
        </>
      ) : (
        <>
          <View className="mt-8 flex-row gap-6 border-b border-line">
            {(
              [
                ['active', `À traiter (${active.length})`],
                ['resolved', `Résolues (${resolved.length})`],
              ] as const
            ).map(([key, label]) => (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: filter === key }}
                onPress={() => setFilter(key)}
                className={`-mb-px border-b-2 pb-3 ${filter === key ? 'border-ink' : 'border-transparent'}`}
              >
                <Text className={`font-sans-medium text-sm ${filter === key ? 'text-ink' : 'text-ink/50'}`}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View className="mt-6">
            <CaseList
              items={filter === 'active' ? active : resolved}
              empty={filter === 'active' ? 'Rien à traiter pour le moment.' : 'Aucune demande résolue.'}
            />
          </View>
        </>
      )}
    </Screen>
  );
}
