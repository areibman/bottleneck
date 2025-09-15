import React from 'react';
import { Composition } from 'remotion';
import { BottleneckPromo } from './BottleneckPromo';

export const Root: React.FC = () => {
	return (
		<>
			<Composition
				id="BottleneckPromo"
				component={BottleneckPromo}
				durationInFrames={980} // ~32.7 seconds at 30fps (includes transitions)
				width={1920}
				height={1080}
				fps={30}
				defaultProps={{}}
			/>
		</>
	);
};