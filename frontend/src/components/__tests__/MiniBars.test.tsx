import { render } from '@testing-library/react-native';
import { MiniBars } from '@/components/MiniBars';

describe('MiniBars', () => {
  it('résume la dernière valeur pour les lecteurs d’écran', async () => {
    const { getByLabelText } = await render(
      <MiniBars values={[3, null, 4.33]} labels={['a', 'b', 'c']} title="Stress" />,
    );
    expect(getByLabelText('Stress : dernière valeur 4,3 sur 5')).toBeTruthy();
  });

  it('signale l’absence de données', async () => {
    const { getByLabelText } = await render(
      <MiniBars values={[null, null]} labels={['a', 'b']} title="Charge" emptyLabel="semaine masquée" />,
    );
    expect(getByLabelText('Charge : semaine masquée')).toBeTruthy();
  });
});
