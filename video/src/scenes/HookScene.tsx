import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

export const HookScene: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	// Text animations
	const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp'
	});

	const subtitleOpacity = interpolate(frame, [40, 70], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp'
	});

	const problemOpacity = interpolate(frame, [80, 110], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp'
	});

	// Animated background elements
	const bgScale = spring({
		fps,
		frame,
		config: { damping: 200 }
	});

	return (
		<AbsoluteFill style={{ 
			background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'center',
			alignItems: 'center',
			padding: 80
		}}>
			{/* Animated background circle */}
			<div
				style={{
					position: 'absolute',
					width: 800,
					height: 800,
					borderRadius: '50%',
					background: 'rgba(255, 255, 255, 0.1)',
					transform: `scale(${bgScale})`,
					opacity: 0.3
				}}
			/>
			
			{/* Main title */}
			<h1
				style={{
					fontSize: 84,
					fontWeight: 'bold',
					color: 'white',
					textAlign: 'center',
					opacity: titleOpacity,
					fontFamily: 'system-ui, -apple-system, sans-serif',
					marginBottom: 40,
					textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
				}}
			>
				The AI Codegen Era
			</h1>

			{/* Subtitle */}
			<h2
				style={{
					fontSize: 48,
					color: 'rgba(255, 255, 255, 0.9)',
					textAlign: 'center',
					opacity: subtitleOpacity,
					fontFamily: 'system-ui, -apple-system, sans-serif',
					marginBottom: 60,
					fontWeight: 300
				}}
			>
				More code than ever. Faster reviews needed.
			</h2>

			{/* Problem statement */}
			<div
				style={{
					fontSize: 32,
					color: 'rgba(255, 255, 255, 0.8)',
					textAlign: 'center',
					opacity: problemOpacity,
					fontFamily: 'system-ui, -apple-system, sans-serif',
					maxWidth: 800,
					lineHeight: 1.4
				}}
			>
				Traditional code review tools are too slow.<br/>
				Your team needs something faster.
			</div>
		</AbsoluteFill>
	);
};