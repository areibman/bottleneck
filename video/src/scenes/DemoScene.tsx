import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Sequence } from 'remotion';

const MockUI: React.FC<{ delay: number }> = ({ delay }) => {
	const frame = useCurrentFrame();

	const opacity = interpolate(frame, [delay, delay + 30], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp'
	});

	const scale = interpolate(frame, [delay, delay + 30], [0.9, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp'
	});

	return (
		<div
			style={{
				opacity,
				transform: `scale(${scale})`,
				width: 800,
				height: 500,
				background: '#1a1a2e',
				borderRadius: 12,
				border: '1px solid #333',
				overflow: 'hidden',
				boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
			}}
		>
			{/* Top bar */}
			<div
				style={{
					height: 60,
					background: '#16213e',
					display: 'flex',
					alignItems: 'center',
					padding: '0 20px',
					borderBottom: '1px solid #333'
				}}
			>
				<div
					style={{
						width: 12,
						height: 12,
						borderRadius: '50%',
						background: '#ff5f57',
						marginRight: 8
					}}
				/>
				<div
					style={{
						width: 12,
						height: 12,
						borderRadius: '50%',
						background: '#ffbd2e',
						marginRight: 8
					}}
				/>
				<div
					style={{
						width: 12,
						height: 12,
						borderRadius: '50%',
						background: '#28ca42',
						marginRight: 20
					}}
				/>
				<div
					style={{
						color: 'white',
						fontSize: 16,
						fontFamily: 'system-ui, -apple-system, sans-serif'
					}}
				>
					Bottleneck - PR Review
				</div>
			</div>

			{/* Sidebar */}
			<div style={{ display: 'flex', height: 440 }}>
				<div
					style={{
						width: 200,
						background: '#0f1419',
						padding: 16,
						borderRight: '1px solid #333'
					}}
				>
					{/* PR List items */}
					{[1, 2, 3, 4].map((i) => (
						<div
							key={i}
							style={{
								height: 60,
								background: i === 1 ? '#4f46e5' : '#1a1a2e',
								borderRadius: 8,
								marginBottom: 8,
								padding: 12,
								color: 'white',
								fontSize: 12,
								fontFamily: 'monospace'
							}}
						>
							<div style={{ fontWeight: 'bold' }}>feat: Add new feature #{i}</div>
							<div style={{ opacity: 0.7 }}>+120 -45</div>
						</div>
					))}
				</div>

				{/* Main content */}
				<div style={{ flex: 1, padding: 20 }}>
					{/* Diff view simulation */}
					<div
						style={{
							background: '#0d1117',
							borderRadius: 8,
							padding: 16,
							height: 300,
							fontFamily: 'monospace',
							fontSize: 14,
							color: '#e6edf3'
						}}
					>
						<div style={{ color: '#7d8590', marginBottom: 8 }}>
							src/components/Button.tsx
						</div>
						<div style={{ background: '#0e4429', padding: '2px 8px', marginBottom: 4 }}>
							<span style={{ color: '#7d8590' }}>+</span>
							<span style={{ color: '#aff5b4', marginLeft: 8 }}>
								export const Button: React.FC = () =&gt; {'{'} 
							</span>
						</div>
						<div style={{ background: '#0e4429', padding: '2px 8px', marginBottom: 4 }}>
							<span style={{ color: '#7d8590' }}>+</span>
							<span style={{ color: '#aff5b4', marginLeft: 8 }}>
								  return &lt;button&gt;Click me&lt;/button&gt;;
							</span>
						</div>
						<div style={{ background: '#0e4429', padding: '2px 8px' }}>
							<span style={{ color: '#7d8590' }}>+</span>
							<span style={{ color: '#aff5b4', marginLeft: 8 }}>
								{'};'}
							</span>
						</div>
					</div>

					{/* Status indicators */}
					<div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
						<div
							style={{
								background: '#28a745',
								color: 'white',
								padding: '4px 12px',
								borderRadius: 16,
								fontSize: 12,
								fontFamily: 'system-ui, -apple-system, sans-serif'
							}}
						>
							✓ Approved
						</div>
						<div
							style={{
								background: '#6f42c1',
								color: 'white',
								padding: '4px 12px',
								borderRadius: 16,
								fontSize: 12,
								fontFamily: 'system-ui, -apple-system, sans-serif'
							}}
						>
							🚀 Ready to merge
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export const DemoScene: React.FC = () => {
	const frame = useCurrentFrame();

	const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp'
	});

	const subtitleOpacity = interpolate(frame, [160, 190], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp'
	});

	return (
		<AbsoluteFill style={{ 
			background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #2a2a5e 100%)',
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'center',
			alignItems: 'center',
			padding: 80
		}}>
			{/* Title */}
			<h1
				style={{
					fontSize: 48,
					fontWeight: 'bold',
					color: 'white',
					textAlign: 'center',
					opacity: titleOpacity,
					fontFamily: 'system-ui, -apple-system, sans-serif',
					marginBottom: 60
				}}
			>
				See It In Action
			</h1>

			{/* Mock UI */}
			<MockUI delay={40} />

			{/* Performance stats */}
			<div
				style={{
					marginTop: 40,
					display: 'flex',
					gap: 60,
					opacity: subtitleOpacity
				}}
			>
				<div style={{ textAlign: 'center' }}>
					<div
						style={{
							fontSize: 36,
							fontWeight: 'bold',
							color: '#4ade80',
							fontFamily: 'system-ui, -apple-system, sans-serif'
						}}
					>
						&lt;150ms
					</div>
					<div
						style={{
							fontSize: 18,
							color: 'rgba(255, 255, 255, 0.7)',
							fontFamily: 'system-ui, -apple-system, sans-serif'
						}}
					>
						First diff paint
					</div>
				</div>
				<div style={{ textAlign: 'center' }}>
					<div
						style={{
							fontSize: 36,
							fontWeight: 'bold',
							color: '#4ade80',
							fontFamily: 'system-ui, -apple-system, sans-serif'
						}}
					>
						50k+
					</div>
					<div
						style={{
							fontSize: 18,
							color: 'rgba(255, 255, 255, 0.7)',
							fontFamily: 'system-ui, -apple-system, sans-serif'
						}}
					>
						Changed lines
					</div>
				</div>
				<div style={{ textAlign: 'center' }}>
					<div
						style={{
							fontSize: 36,
							fontWeight: 'bold',
							color: '#4ade80',
							fontFamily: 'system-ui, -apple-system, sans-serif'
						}}
					>
						60 FPS
					</div>
					<div
						style={{
							fontSize: 18,
							color: 'rgba(255, 255, 255, 0.7)',
							fontFamily: 'system-ui, -apple-system, sans-serif'
						}}
					>
						Smooth scrolling
					</div>
				</div>
			</div>
		</AbsoluteFill>
	);
};