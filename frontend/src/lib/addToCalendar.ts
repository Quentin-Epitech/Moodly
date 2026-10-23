import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { toIcs, type CalendarEvent } from './calendar';

/**
 * Ouvre des événements dans l'agenda de l'utilisateur :
 * - web : téléchargement d'un fichier .ics (Outlook, Apple Calendar, Google Agenda l'importent) ;
 * - mobile : fichier .ics partagé via la feuille système (« Ajouter à Calendrier »).
 */
export async function addToCalendar(events: CalendarEvent[], fileName = 'moodly.ics'): Promise<void> {
  const ics = toIcs(events);

  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(ics);
  if (!(await Sharing.isAvailableAsync())) throw new Error("Le partage n'est pas disponible sur cet appareil");
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/calendar',
    UTI: 'public.calendar-event',
    dialogTitle: 'Ajouter à mon agenda',
  });
}
