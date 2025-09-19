import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

export const CallToActionScene: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	// Title animation
	const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp'
	});

	const titleScale = spring({
		fps,
		frame: frame - 10,
		config: { damping: 200 }
	});

	// CTA button animation
	const buttonOpacity = interpolate(frame, [40, 70], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp'
	});

	const buttonY = interpolate(frame, [40, 70], [50, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp'
	});

	// Pulsing animation for button
	const buttonPulse = Math.sin((frame - 70) * 0.2) * 0.05 + 1;

	return (
		<AbsoluteFill style={{ 
			background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'center',
			alignItems: 'center',
			padding: 80
		}}>
			{/* Background elements */}
			<div
				style={{
					position: 'absolute',
					width: 600,
					height: 600,
					borderRadius: '50%',
					background: 'rgba(255, 255, 255, 0.1)',
					opacity: 0.3
				}}
			/>
			<div
				style={{
					position: 'absolute',
					width: 400,
					height: 400,
					borderRadius: '50%',
					background: 'rgba(255, 255, 255, 0.05)',
					opacity: 0.5
				}}
			/>

			{/* Main title */}
			<h1
				style={{
					fontSize: 72,
					fontWeight: 'bold',
					color: 'white',
					textAlign: 'center',
					opacity: titleOpacity,
					transform: `scale(${titleScale})`,
					fontFamily: 'system-ui, -apple-system, sans-serif',
					marginBottom: 20,
					textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
				}}
			>
				Ready to Speed Up<br/>Your Code Reviews?
			</h1>

			{/* CTA Button */}
			<div
				style={{
					opacity: buttonOpacity,
					transform: `translateY(${buttonY}px) scale(${frame > 70 ? buttonPulse : 1})`,
					marginTop: 40
				}}
			>
				<div
					style={{
						background: 'white',
						color: '#4f46e5',
						padding: '20px 60px',
						borderRadius: 50,
						fontSize: 32,
						fontWeight: 'bold',
						fontFamily: 'system-ui, -apple-system, sans-serif',
						boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
						cursor: 'pointer',
						textAlign: 'center'
					}}
				>
					Get Started Today
				</div>
			</div>

			{/* Subtitle */}
			<div
				style={{
					fontSize: 24,
					color: 'rgba(255, 255, 255, 0.8)',
					textAlign: 'center',
					opacity: buttonOpacity,
					fontFamily: 'system-ui, -apple-system, sans-serif',
					marginTop: 30,
					fontWeight: 300
				}}
			>
				github.com/bottleneck
			</div>
		</AbsoluteFill>
	);
};