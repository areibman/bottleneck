import React from 'react';
import {Composition} from 'remotion';
import {BottleneckPromo} from './BottleneckPromo';

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="BottleneckPromo"
				component={BottleneckPromo}
				durationInFrames={450} // 15 seconds at 30fps
				fps={30}
				width={1920}
				height={1080}
				defaultProps={{}}
			/>
		</>
	);
};