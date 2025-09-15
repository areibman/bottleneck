import React from 'react';
import {AbsoluteFill, Sequence, useVideoConfig} from 'remotion';
import {TitleSequence} from './components/TitleSequence';
import {FeatureShowcase} from './components/FeatureShowcase';
import {AIEraSection} from './components/AIEraSection';
import {CallToAction} from './components/CallToAction';
import {Background} from './components/Background';

export const BottleneckPromo: React.FC = () => {
	const {durationInFrames} = useVideoConfig();

	return (
		<AbsoluteFill>
			{/* Animated background throughout the video */}
			<Background />

			{/* Title Sequence - 0-90 frames (3 seconds) */}
			<Sequence from={0} durationInFrames={90}>
				<TitleSequence />
			</Sequence>

			{/* Feature Showcase - 60-240 frames (6 seconds with 1s overlap) */}
			<Sequence from={60} durationInFrames={180}>
				<FeatureShowcase />
			</Sequence>

			{/* AI Era Section - 210-360 frames (5 seconds with 1s overlap) */}
			<Sequence from={210} durationInFrames={150}>
				<AIEraSection />
			</Sequence>

			{/* Call to Action - 330-450 frames (4 seconds with 1s overlap) */}
			<Sequence from={330} durationInFrames={120}>
				<CallToAction />
			</Sequence>
		</AbsoluteFill>
	);
};