# Vidéo de présentation

Deux montages, chacun en deux formats : une version complète d'environ 87 secondes et un **montage court de
30 secondes** (`npm run render:30s`). Formats : **16:9** (soutenance, vidéoprojecteur) et **9:16** (réseaux
sociaux). Réalisée en code avec [Remotion](https://www.remotion.dev) et three.js : les iPhone et l'ordinateur en 3D
affichent les **vrais écrans de Moodly**, capturés automatiquement dans l'app qui tourne en local.

## Régénérer

```bash
cd video
npm install
npm run capture        # remet la démo à zéro, puis capture les écrans (stack Docker lancée, Chrome installé)
npm run render         # version complète : out/moodly-16x9.mp4 et out/moodly-9x16.mp4 (rendu en 4K, réduit en 1080p)
npm run render:30s     # montage court : out/moodly-30s-16x9.mp4 et out/moodly-30s-9x16.mp4
npm run studio         # aperçu interactif et réglages, dans le navigateur
```

Relancez `npm run capture` après chaque changement visible dans l'app : la vidéo suit automatiquement.

## Organisation

| Fichier | Rôle |
| --- | --- |
| `scripts/capture.mjs` | Parcours Playwright qui produit `public/screens/*.png` (mobile 390 × 797, sous la barre d'état dessinée par la vidéo, et ordinateur 1440 × 900) |
| `src/Video.tsx` | Version complète : ordre et durée des scènes (30 images par seconde) |
| `src/ShortVideo.tsx` | Montage court de 30 secondes |
| `src/scenes/` | Une scène par fichier : intro, problème, employé, suivi, anonymat, manager, demandes, direction, fin |
| `src/three/` | Modèles 3D (téléphone, ordinateur), barre d'état et changement d'écran par glissement |
| `src/components/` | Textes animés, surligneur, logo, fond |
| `src/theme.ts` | Couleurs et polices de l'app |

Pas de musique (droits d'auteur) : ajoutez-en une libre de droits au montage si besoin.
