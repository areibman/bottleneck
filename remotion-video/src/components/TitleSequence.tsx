import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig} from 'remotion';

export const TitleSequence: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	// Logo animation
	const logoScale = spring({
		frame,
		fps,
		config: {
			damping: 200,
		},
	});

	// Title text animation
	const titleOpacity = interpolate(
		frame,
		[10, 25],
		[0, 1],
		{
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}
	);

	const titleY = interpolate(
		frame,
		[10, 30],
		[50, 0],
		{
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}
	);

	// Tagline animation
	const taglineOpacity = interpolate(
		frame,
		[30, 50],
		[0, 1],
		{
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}
	);

	const taglineScale = spring({
		frame: frame - 30,
		fps,
		config: {
			damping: 100,
		},
	});

	// Exit animation
	const exitOpacity = interpolate(
		frame,
		[70, 90],
		[1, 0],
		{
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}
	);

	return (
		<AbsoluteFill
			style={{
				justifyContent: 'center',
				alignItems: 'center',
				opacity: exitOpacity,
			}}
		>
			{/* Logo/Icon */}
			<div
				style={{
					position: 'absolute',
					transform: `scale(${logoScale})`,
				}}
			>
				<BottleneckLogo />
			</div>

			{/* Title */}
			<div
				style={{
					position: 'absolute',
					top: '55%',
					opacity: titleOpacity,
					transform: `translateY(${titleY}px)`,
				}}
			>
				<h1
					style={{
						fontSize: '80px',
						fontWeight: 'bold',
						color: 'white',
						textAlign: 'center',
						fontFamily: 'system-ui, -apple-system, sans-serif',
						letterSpacing: '-2px',
						textShadow: '0 4px 20px rgba(0,0,0,0.5)',
					}}
				>
					Bottleneck
				</h1>
			</div>

			{/* Tagline */}
			<div
				style={{
					position: 'absolute',
					top: '70%',
					opacity: taglineOpacity,
					transform: `scale(${taglineScale})`,
				}}
			>
				<p
					style={{
						fontSize: '32px',
						color: '#94a3b8',
						textAlign: 'center',
						fontFamily: 'system-ui, -apple-system, sans-serif',
						fontWeight: '300',
					}}
				>
					Code Review Made Simple
				</p>
			</div>
		</AbsoluteFill>
	);
};

const BottleneckLogo: React.FC = () => {
	const frame = useCurrentFrame();
	
	// Animated bottle neck effect
	const neckWidth = interpolate(
		frame,
		[0, 30],
		[100, 40],
		{
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}
	);

	return (
		<svg
			width="200"
			height="200"
			viewBox="0 0 200 200"
			style={{
				filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.3))',
			}}
		>
			{/* Bottle shape */}
			<path
				d={`
					M 100 20
					L ${100 - neckWidth/2} 60
					L ${100 - neckWidth/2} 100
					L 60 180
					L 140 180
					L ${100 + neckWidth/2} 100
					L ${100 + neckWidth/2} 60
					Z
				`}
				fill="url(#bottleGradient)"
				stroke="#64748b"
				strokeWidth="2"
			/>
			
			{/* Gradient definition */}
			<defs>
				<linearGradient id="bottleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stopColor="#3b82f6" />
					<stop offset="100%" stopColor="#8b5cf6" />
				</linearGradient>
			</defs>

			{/* Code symbols flowing through */}
			<text
				x="100"
				y="120"
				textAnchor="middle"
				fill="white"
				fontSize="24"
				fontFamily="monospace"
				opacity={interpolate(frame % 30, [0, 15, 30], [0, 1, 0])}
			>
				{'</>'}
			</text>
		</svg>
	);
};