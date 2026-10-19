import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

// Couleurs reprises de frontend/src/theme/palette.js (même identité que l'app)
export const color = {
  bg: '#FBF7F0',
  surface: '#F6EFE4',
  ink: '#1B1A22',
  muted: 'rgba(27, 26, 34, 0.66)',
  line: '#ECE3D6',
  accent: '#5B3DF5',
  accentSoft: '#D9D0FF',
  mood: ['#FF5A45', '#FF8A2A', '#FFC21A', '#7CCB3F', '#16B36E'],
  marker: { sun: '#FFD12E', mint: '#6FE0A8', peach: '#FFA37A', sky: '#86C3FF', violet: '#B3A1FF' },
  phone: '#1B1A22',
  laptop: '#E7E4DE',
};

export const font = {
  serif: 'Fraunces',
  sans: 'Inter',
};

// Polices de l'app, chargées depuis public/fonts (pas d'appel réseau au rendu)
const fonts: Array<[string, string, string]> = [
  ['Fraunces', 'Fraunces_400Regular.ttf', '400'],
  ['Inter', 'Inter_400Regular.ttf', '400'],
  ['Inter', 'Inter_500Medium.ttf', '500'],
  ['Inter', 'Inter_600SemiBold.ttf', '600'],
];
for (const [family, file, weight] of fonts) {
  loadFont({ family, url: staticFile(`fonts/${file}`), weight });
}
