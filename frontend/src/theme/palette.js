// Palette Moodly — direction éditoriale (serif, beaucoup de blanc, boutons noirs)
// relevée par des couleurs franches : une teinte vive par humeur, du corail au
// vert, et un violet d'accent pour la marque et la navigation. Les panneaux sont
// crème plutôt que gris. Consommée par tailwind.config.js (classes bg-ink,
// text-ink/70, bg-mood-3, bg-mood-soft-3, bg-accent…) et importée directement là
// où il faut une valeur brute (graphes, icônes). Modifier ici, nulle part ailleurs.
module.exports = {
  bg: '#FFFFFF',
  surface: '#F6EFE4', // panneaux, lignes numérotées (crème)
  surface2: '#EDE3D3', // état pressé des panneaux
  ink: '#1B1A22', // texte, boutons, courbe
  line: '#ECE3D6', // filets, bordures
  hidden: '#C9C2B8', // jours masqués par le seuil d'anonymat

  // Marque : navigation, sélection, pastilles « nouveau »
  accent: '#5B3DF5',
  'accent-soft': '#D9D0FF',

  // Humeur de 1 (difficile) à 5 (super). Le texte posé dessus reste en encre.
  mood: {
    1: '#FF5A45',
    2: '#FF8A2A',
    3: '#FFC21A',
    4: '#7CCB3F',
    5: '#16B36E',
  },
  // Même teinte, moins dense : cercles au repos, fonds de pastille
  'mood-soft': {
    1: '#FFB3A8',
    2: '#FFC797',
    3: '#FFE186',
    4: '#C5EA9F',
    5: '#93E2BD',
  },

  // Fonds colorés pour varier les blocs (conseils, cartes)
  sky: '#B9DCFF',
  peach: '#FFC9AE',
  mint: '#A9EBCB',
  sun: '#FFE07A',

  // Surligneur des titres
  marker: {
    sun: '#FFD12E',
    mint: '#6FE0A8',
    peach: '#FFA37A',
    sky: '#86C3FF',
    violet: '#B3A1FF',
  },

  danger: '#C42A1C',
  'danger-soft': '#FFC4BA',
  warning: '#8A5300',
  'warning-soft': '#FFE08A',
  success: '#127A47',
  'success-soft': '#AEEACB',
};
