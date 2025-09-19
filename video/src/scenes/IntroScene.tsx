import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

export const IntroScene: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	// Logo animation
	const logoScale = spring({
		fps,
		frame: frame - 10,
		config: { damping: 200 }
	});

	const logoOpacity = interpolate(frame, [0, 30], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp'
	});

	// Title animation
	const titleOpacity = interpolate(frame, [40, 70], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp'
	});

	const titleY = interpolate(frame, [40, 70], [50, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp'
	});

	// Tagline animation
	const taglineOpacity = interpolate(frame, [80, 110], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp'
	});

	return (
		<AbsoluteFill style={{ 
			background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'center',
			alignItems: 'center',
			padding: 80
		}}>
			{/* Bottleneck Logo */}
			<div
				style={{
					width: 200,
					height: 200,
					backgroundColor: '#4f46e5',
					borderRadius: 24,
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					transform: `scale(${logoScale})`,
					opacity: logoOpacity,
					marginBottom: 60,
					boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
				}}
			>
				<div
					style={{
						fontSize: 72,
						color: 'white',
						fontWeight: 'bold',
						fontFamily: 'system-ui, -apple-system, sans-serif'
					}}
				>
					B
				</div>
			</div>

			{/* Title */}
			<h1
				style={{
					fontSize: 96,
					fontWeight: 'bold',
					color: 'white',
					textAlign: 'center',
					opacity: titleOpacity,
					transform: `translateY(${titleY}px)`,
					fontFamily: 'system-ui, -apple-system, sans-serif',
					marginBottom: 40,
					textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
				}}
			>
				Bottleneck
			</h1>

			{/* Tagline */}
			<div
				style={{
					fontSize: 36,
					color: 'rgba(255, 255, 255, 0.9)',
					textAlign: 'center',
					opacity: taglineOpacity,
					fontFamily: 'system-ui, -apple-system, sans-serif',
					fontWeight: 300
				}}
			>
				Lightning-fast GitHub PR reviews<br/>
				Built for the AI codegen era
			</div>
		</AbsoluteFill>
	);
};