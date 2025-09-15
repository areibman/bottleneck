import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, interpolate, spring, useVideoConfig} from 'remotion';

export const FeatureShowcase: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	// Entrance animation
	const entranceScale = spring({
		frame,
		fps,
		config: {
			damping: 100,
		},
	});

	return (
		<AbsoluteFill
			style={{
				transform: `scale(${entranceScale})`,
			}}
		>
			{/* Feature Cards */}
			<Sequence from={0} durationInFrames={60}>
				<FeatureCard
					title="Lightning Fast PR Reviews"
					description="Review pull requests instantly with smart diff views"
					icon="⚡"
					color="#3b82f6"
					index={0}
				/>
			</Sequence>

			<Sequence from={40} durationInFrames={60}>
				<FeatureCard
					title="Smart Branch Management"
					description="Switch, merge, and manage branches effortlessly"
					icon="🌳"
					color="#10b981"
					index={1}
				/>
			</Sequence>

			<Sequence from={80} durationInFrames={60}>
				<FeatureCard
					title="Integrated Terminal"
					description="Run commands without leaving your review flow"
					icon="💻"
					color="#8b5cf6"
					index={2}
				/>
			</Sequence>

			<Sequence from={120} durationInFrames={60}>
				<FeatureCard
					title="GitHub Integration"
					description="Seamless sync with your GitHub repositories"
					icon="🔗"
					color="#f59e0b"
					index={3}
				/>
			</Sequence>
		</AbsoluteFill>
	);
};

interface FeatureCardProps {
	title: string;
	description: string;
	icon: string;
	color: string;
	index: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({title, description, icon, color, index}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	// Card entrance animation
	const slideIn = spring({
		frame,
		fps,
		config: {
			damping: 100,
		},
	});

	const opacity = interpolate(
		frame,
		[0, 20],
		[0, 1],
		{
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}
	);

	// Exit animation
	const exitOpacity = interpolate(
		frame,
		[40, 60],
		[1, 0],
		{
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}
	);

	// Position based on index
	const positions = [
		{x: '25%', y: '25%'},
		{x: '55%', y: '25%'},
		{x: '25%', y: '55%'},
		{x: '55%', y: '55%'},
	];

	const position = positions[index];

	return (
		<div
			style={{
				position: 'absolute',
				left: position.x,
				top: position.y,
				transform: `translate(-50%, -50%) translateX(${(1 - slideIn) * 100}px)`,
				opacity: opacity * exitOpacity,
			}}
		>
			<div
				style={{
					background: 'rgba(255, 255, 255, 0.1)',
					backdropFilter: 'blur(10px)',
					border: '1px solid rgba(255, 255, 255, 0.2)',
					borderRadius: '20px',
					padding: '30px',
					width: '400px',
					boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
				}}
			>
				{/* Icon */}
				<div
					style={{
						fontSize: '48px',
						marginBottom: '15px',
						transform: `rotate(${frame * 2}deg)`,
					}}
				>
					{icon}
				</div>

				{/* Title */}
				<h3
					style={{
						fontSize: '24px',
						fontWeight: 'bold',
						color: 'white',
						marginBottom: '10px',
						fontFamily: 'system-ui, -apple-system, sans-serif',
					}}
				>
					{title}
				</h3>

				{/* Description */}
				<p
					style={{
						fontSize: '16px',
						color: '#cbd5e1',
						lineHeight: '1.5',
						fontFamily: 'system-ui, -apple-system, sans-serif',
					}}
				>
					{description}
				</p>

				{/* Accent bar */}
				<div
					style={{
						position: 'absolute',
						left: 0,
						top: 0,
						width: `${slideIn * 100}%`,
						height: '4px',
						background: color,
						borderRadius: '20px 20px 0 0',
						transition: 'width 0.5s ease',
					}}
				/>
			</div>
		</div>
	);
};