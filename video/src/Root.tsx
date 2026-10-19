import { Composition } from 'remotion';
import { MoodlyShort, SHORT_FRAMES } from './ShortVideo';
import { MoodlyVideo, TOTAL_FRAMES } from './Video';

export function Root() {
  return (
    <>
      <Composition id="Moodly16x9" component={MoodlyVideo} durationInFrames={TOTAL_FRAMES} fps={30} width={1920} height={1080} />
      <Composition id="Moodly9x16" component={MoodlyVideo} durationInFrames={TOTAL_FRAMES} fps={30} width={1080} height={1920} />
      <Composition id="Moodly30s16x9" component={MoodlyShort} durationInFrames={SHORT_FRAMES} fps={30} width={1920} height={1080} />
      <Composition id="Moodly30s9x16" component={MoodlyShort} durationInFrames={SHORT_FRAMES} fps={30} width={1080} height={1920} />
    </>
  );
}
