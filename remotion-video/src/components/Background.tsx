import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';

export const Background: React.FC = () => {
	const frame = useCurrentFrame();

	// Animated gradient background
	const gradientAngle = interpolate(
		frame,
		[0, 450],
		[0, 360],
		{
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}
	);

	const gradientPosition = interpolate(
		frame,
		[0, 450],
		[0, 100],
		{
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}
	);

	return (
		<AbsoluteFill
			style={{
				background: `linear-gradient(${gradientAngle}deg, 
					#0f172a 0%, 
					#1e293b ${gradientPosition}%, 
					#334155 100%)`,
			}}
		>
			{/* Animated code particles */}
			<CodeParticles />
		</AbsoluteFill>
	);
};

const CodeParticles: React.FC = () => {
	const frame = useCurrentFrame();
	const particles = ['<>', '{}', '[]', '//', '/*', '*/', 'git', 'PR', '++', '--'];

	return (
		<>
			{particles.map((particle, index) => {
				const delay = index * 20;
				const yPos = interpolate(
					frame + delay,
					[0, 300],
					[110, -10],
					{
						extrapolateLeft: 'clamp',
						extrapolateRight: 'wrap',
					}
				);

				const opacity = interpolate(
					(frame + delay) % 300,
					[0, 150, 300],
					[0, 0.3, 0],
					{
						extrapolateLeft: 'clamp',
						extrapolateRight: 'clamp',
					}
				);

				const xPos = 10 + (index * 10) % 90;

				return (
					<div
						key={index}
						style={{
							position: 'absolute',
							left: `${xPos}%`,
							top: `${yPos}%`,
							fontSize: '24px',
							fontFamily: 'monospace',
							color: '#64748b',
							opacity,
							transform: `rotate(${frame * 2}deg)`,
						}}
					>
						{particle}
					</div>
				);
			})}
		</>
	);
};