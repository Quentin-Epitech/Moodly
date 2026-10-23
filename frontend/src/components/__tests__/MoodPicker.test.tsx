import { fireEvent, render } from '@testing-library/react-native';
import { MoodPicker } from '@/components/MoodPicker';

describe('MoodPicker', () => {
  it('propose cinq notes et renvoie celle qui est touchée', async () => {
    const onChange = jest.fn();
    const { getAllByRole, getByLabelText } = await render(<MoodPicker value={null} onChange={onChange} />);

    expect(getAllByRole('button')).toHaveLength(5);
    await fireEvent.press(getByLabelText('Humeur : Bof, 2 sur 5'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('marque la note sélectionnée', async () => {
    const { getByLabelText } = await render(<MoodPicker value={4} onChange={() => {}} />);

    expect(getByLabelText('Humeur : Bien, 4 sur 5')).toBeSelected();
    expect(getByLabelText('Humeur : Super, 5 sur 5')).not.toBeSelected();
  });
});
