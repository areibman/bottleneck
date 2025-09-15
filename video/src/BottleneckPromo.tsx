import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { wipe } from '@remotion/transitions/wipe';
import { HookScene } from './scenes/HookScene';
import { IntroScene } from './scenes/IntroScene';
import { FeaturesScene } from './scenes/FeaturesScene';
import { DemoScene } from './scenes/DemoScene';
import { CallToActionScene } from './scenes/CallToActionScene';

export const BottleneckPromo: React.FC = () => {
	return (
		<AbsoluteFill style={{ backgroundColor: '#0f0f23' }}>
			<TransitionSeries>
				{/* Hook - The problem with slow code reviews */}
				<TransitionSeries.Sequence durationInFrames={150}>
					<HookScene />
				</TransitionSeries.Sequence>

				{/* Fade transition */}
				<TransitionSeries.Transition
					timing={linearTiming({ durationInFrames: 20 })}
					presentation={fade()}
				/>

				{/* Introduction - Bottleneck solution */}
				<TransitionSeries.Sequence durationInFrames={120}>
					<IntroScene />
				</TransitionSeries.Sequence>

				{/* Wipe transition */}
				<TransitionSeries.Transition
					timing={linearTiming({ durationInFrames: 20 })}
					presentation={wipe({ direction: 'from-left' })}
				/>

				{/* Features showcase */}
				<TransitionSeries.Sequence durationInFrames={300}>
					<FeaturesScene />
				</TransitionSeries.Sequence>

				{/* Fade transition */}
				<TransitionSeries.Transition
					timing={linearTiming({ durationInFrames: 20 })}
					presentation={fade()}
				/>

				{/* Demo simulation */}
				<TransitionSeries.Sequence durationInFrames={240}>
					<DemoScene />
				</TransitionSeries.Sequence>

				{/* Wipe transition */}
				<TransitionSeries.Transition
					timing={linearTiming({ durationInFrames: 20 })}
					presentation={wipe({ direction: 'from-right' })}
				/>

				{/* Call to action */}
				<TransitionSeries.Sequence durationInFrames={90}>
					<CallToActionScene />
				</TransitionSeries.Sequence>
			</TransitionSeries>
		</AbsoluteFill>
	);
};