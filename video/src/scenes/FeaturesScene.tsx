import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Sequence } from 'remotion';

const FeatureCard: React.FC<{
	icon: string;
	title: string;
	description: string;
	delay: number;
}> = ({ icon, title, description, delay }) => {
	const frame = useCurrentFrame();

	const opacity = interpolate(frame, [delay, delay + 30], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp'
	});

	const translateY = interpolate(frame, [delay, delay + 30], [50, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp'
	});

	return (
		<div
			style={{
				background: 'rgba(255, 255, 255, 0.1)',
				borderRadius: 16,
				padding: 40,
				backdropFilter: 'blur(10px)',
				border: '1px solid rgba(255, 255, 255, 0.2)',
				opacity,
				transform: `translateY(${translateY}px)`,
				width: 350,
				height: 250,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				textAlign: 'center'
			}}
		>
			<div style={{ fontSize: 64, marginBottom: 20 }}>{icon}</div>
			<h3
				style={{
					fontSize: 28,
					fontWeight: 'bold',
					color: 'white',
					marginBottom: 16,
					fontFamily: 'system-ui, -apple-system, sans-serif'
				}}
			>
				{title}
			</h3>
			<p
				style={{
					fontSize: 18,
					color: 'rgba(255, 255, 255, 0.8)',
					lineHeight: 1.4,
					fontFamily: 'system-ui, -apple-system, sans-serif'
				}}
			>
				{description}
			</p>
		</div>
	);
};

export const FeaturesScene: React.FC = () => {
	const frame = useCurrentFrame();

	const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp'
	});

	return (
		<AbsoluteFill style={{ 
			background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%)',
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'center',
			alignItems: 'center',
			padding: 80
		}}>
			{/* Title */}
			<h1
				style={{
					fontSize: 64,
					fontWeight: 'bold',
					color: 'white',
					textAlign: 'center',
					opacity: titleOpacity,
					fontFamily: 'system-ui, -apple-system, sans-serif',
					marginBottom: 80
				}}
			>
				Why Bottleneck?
			</h1>

			{/* Features Grid */}
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(3, 1fr)',
					gap: 40,
					maxWidth: 1200
				}}
			>
				<FeatureCard
					icon="⚡"
					title="Lightning Fast"
					description="Near-instant navigation and diff rendering. No more waiting."
					delay={40}
				/>
				<FeatureCard
					icon="🔄"
					title="Smart Sync"
					description="Incremental updates with intelligent caching. Always up to date."
					delay={70}
				/>
				<FeatureCard
					icon="👥"
					title="Bulk Actions"
					description="Multi-select PRs for batch operations. Review at scale."
					delay={100}
				/>
				<FeatureCard
					icon="🏷️"
					title="Smart Grouping"
					description="Auto-groups PRs by prefixes. Organized workflows."
					delay={130}
				/>
				<FeatureCard
					icon="⌨️"
					title="Keyboard First"
					description="Comprehensive shortcuts for power users. Never touch the mouse."
					delay={160}
				/>
				<FeatureCard
					icon="💾"
					title="Offline Ready"
					description="SQLite-based local cache. Work anywhere, anytime."
					delay={190}
				/>
			</div>
		</AbsoluteFill>
	);
};