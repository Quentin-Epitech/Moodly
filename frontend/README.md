# Moodly — app mobile (parcours employé)

Application Expo (React Native) pour le suivi d’humeur, le bilan hebdomadaire, les demandes et les conseils.

## Prérequis

- Node.js 20+
- Un backend Moodly joignable (voir `.env.example`)

## Lancer le projet

```bash
cp .env.example .env   # renseigner l’URL de l’API (IP LAN depuis un téléphone)
npm install
npm start              # QR code avec Expo Go
npm run web            # http://localhost:8081
npm test
```

## Structure

- `src/app/` — écrans (Expo Router)
- `src/api/` — appels HTTP
- `src/auth/` — session et aiguillage
- `src/components/` — UI NativeWind
- `src/lib/` — dates, questions, historique local, calendrier
- `src/theme/` — couleurs
