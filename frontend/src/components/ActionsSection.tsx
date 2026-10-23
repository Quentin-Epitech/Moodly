import { useState } from 'react';
import { Text, View } from 'react-native';
import type { Slot, TeamAction } from '@/api';
import { ActionCard } from './ActionCard';
import { Button } from './Button';
import { ErrorMessage } from './ErrorMessage';
import { EMPTY_SLOT, SlotPicker, slotFromDraft, type SlotDraft } from './SlotPicker';
import { TextField } from './TextField';
import { Toggle } from './Toggle';

const MIN_LENGTH = 3;
const MAX_LENGTH = 280;

type Props = {
  actions: TeamAction[];
  canManage: boolean;
  onCreate?: (message: string, event?: Slot) => Promise<void>;
  /** Pour le titre des rendez-vous d'équipe dans l'agenda */
  teamName?: string;
  onDelete?: (id: number) => Promise<void>;
};

// « Ce qu'on change » : le manager publie, l'équipe lit
export function ActionsSection({ actions, canManage, onCreate, onDelete, teamName }: Props) {
  const [message, setMessage] = useState('');
  const [withEvent, setWithEvent] = useState(false);
  const [slot, setSlot] = useState<SlotDraft>(EMPTY_SLOT);
  const event = withEvent ? slotFromDraft(slot) : null;
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publish = async () => {
    if (!onCreate) return;
    setSending(true);
    setError(null);
    try {
      await onCreate(message.trim(), event ?? undefined);
      setMessage('');
      setWithEvent(false);
      setSlot(EMPTY_SLOT);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSending(false);
    }
  };

  return (
    <View className="gap-4">
      {canManage && (
        <View>
          <Text className="font-sans text-sm leading-5 text-ink/70">
            Dites à l'équipe ce que vous changez suite à ses retours. Visible par tous ses membres.
          </Text>
          <View className="mt-4">
            <TextField
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={MAX_LENGTH}
              placeholder="Ex. : on gèle les nouvelles demandes jusqu'à la fin du sprint."
              className="min-h-[96px]"
              textAlignVertical="top"
            />
          </View>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="font-sans text-xs text-ink/50">
              {message.trim().length} / {MAX_LENGTH}
            </Text>
          </View>
          <View className="mt-3">
            <Toggle
              label="C'est un point d'équipe"
              hint="Ajoutez une date : chacun pourra l'ajouter à son agenda en un geste."
              value={withEvent}
              onChange={setWithEvent}
            />
          </View>
          {withEvent && (
            <View className="mt-3 rounded-lg border border-line px-4 py-4">
              <SlotPicker value={slot} onChange={setSlot} places={['Salle de réunion', 'Visio', 'Open space']} />
            </View>
          )}
          <View className="mt-3 gap-2">
            <ErrorMessage message={error} />
            <Button
              title="Publier"
              onPress={() => void publish()}
              loading={sending}
              disabled={message.trim().length < MIN_LENGTH || (withEvent && event === null)}
            />
          </View>
        </View>
      )}

      {actions.length === 0 ? (
        <Text className="font-sans text-sm text-ink/50">Aucune action publiée pour l'instant.</Text>
      ) : (
        <View className="gap-3">
          {actions.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              teamName={teamName}
              onDelete={canManage && onDelete ? () => void onDelete(action.id) : undefined}
            />
          ))}
        </View>
      )}
    </View>
  );
}
