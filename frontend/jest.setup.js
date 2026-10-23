/* global jest */
// Stockage local simulé (suivi personnel, codes de suivi) pour les tests
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
