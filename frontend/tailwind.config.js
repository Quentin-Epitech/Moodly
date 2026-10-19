// Les couleurs sont centralisées dans src/theme/palette.js ; les polices sont
// chargées dans src/app/_layout.tsx (expo-font) sous les noms utilisés ici.
const palette = require('./src/theme/palette');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: palette,
      fontFamily: {
        // Titres : serif éditoriale
        serif: ['Fraunces_400Regular'],
        // Interface : Inter (une famille par graisse, React Native ne synthétise pas)
        sans: ['Inter_400Regular'],
        'sans-light': ['Inter_300Light'],
        'sans-medium': ['Inter_500Medium'],
        'sans-semibold': ['Inter_600SemiBold'],
      },
    },
  },
  plugins: [],
};
