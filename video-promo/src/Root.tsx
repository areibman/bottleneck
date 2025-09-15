import { Composition } from 'remotion';
import { BottleneckPromo } from './BottleneckPromo';

export const Root: React.FC = () => {
	return (
		<>
			<Composition
				id="BottleneckPromo"
				component={BottleneckPromo}
				durationInFrames={900} // 30 seconds at 30fps
				width={1920}
				height={1080}
				fps={30}
				defaultProps={{}}
			/>
		</>
	);
};