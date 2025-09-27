import {Composition} from 'remotion';
import {Promo} from './Promo';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="MyComp"
        component={Promo}
        durationInFrames={450}
        width={1920}
        height={1080}
        fps={30}
        defaultProps={{}}
      />
    </>
  );
};

