import {Composition} from 'remotion';
import {BottleneckPromo} from './BottleneckPromo';

export const Root: React.FC = () => {
	return (
		<>
			<Composition
				id="MyComp"
				component={BottleneckPromo}
				durationInFrames={240}
				width={1920}
				height={1080}
				fps={30}
				defaultProps={{}}
			/>
		</>
	);
};