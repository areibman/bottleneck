import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig} from 'remotion';

export const CallToAction: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	// Main CTA animation
	const ctaScale = spring({
		frame,
		fps,
		config: {
			damping: 100,
		},
	});

	const ctaOpacity = interpolate(
		frame,
		[0, 20],
		[0, 1],
		{
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}
	);

	// Button pulse animation
	const buttonScale = interpolate(
		frame % 60,
		[0, 30, 60],
		[1, 1.05, 1],
		{
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}
	);

	// Glow effect
	const glowIntensity = interpolate(
		frame % 90,
		[0, 45, 90],
		[0, 20, 0],
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
			}}
		>
			<div
				style={{
					opacity: ctaOpacity,
					transform: `scale(${ctaScale})`,
					textAlign: 'center',
				}}
			>
				{/* Main Headline */}
				<h2
					style={{
						fontSize: '72px',
						fontWeight: 'bold',
						color: 'white',
						marginBottom: '20px',
						fontFamily: 'system-ui, -apple-system, sans-serif',
						letterSpacing: '-2px',
						textShadow: '0 4px 20px rgba(0,0,0,0.5)',
					}}
				>
					Stop Fighting Your Tools
				</h2>

				{/* Subheadline */}
				<p
					style={{
						fontSize: '32px',
						color: '#94a3b8',
						marginBottom: '50px',
						fontFamily: 'system-ui, -apple-system, sans-serif',
						fontWeight: '300',
					}}
				>
					Start Shipping Faster
				</p>

				{/* CTA Button */}
				<div
					style={{
						display: 'inline-block',
						transform: `scale(${buttonScale})`,
						boxShadow: `0 0 ${glowIntensity}px rgba(59, 130, 246, 0.8)`,
					}}
				>
					<button
						style={{
							background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
							color: 'white',
							fontSize: '28px',
							fontWeight: 'bold',
							padding: '20px 60px',
							borderRadius: '50px',
							border: 'none',
							fontFamily: 'system-ui, -apple-system, sans-serif',
							cursor: 'pointer',
							boxShadow: '0 10px 40px rgba(59, 130, 246, 0.4)',
						}}
					>
						Get Bottleneck Now
					</button>
				</div>

				{/* Features Summary */}
				<div
					style={{
						marginTop: '60px',
						display: 'flex',
						justifyContent: 'center',
						gap: '40px',
						opacity: interpolate(frame, [40, 60], [0, 1], {
							extrapolateLeft: 'clamp',
							extrapolateRight: 'clamp',
						}),
					}}
				>
					<FeaturePill text="Free to Start" delay={0} />
					<FeaturePill text="GitHub Ready" delay={10} />
					<FeaturePill text="AI Powered" delay={20} />
				</div>

				{/* Website URL */}
				<div
					style={{
						marginTop: '40px',
						opacity: interpolate(frame, [60, 80], [0, 1], {
							extrapolateLeft: 'clamp',
							extrapolateRight: 'clamp',
						}),
					}}
				>
					<p
						style={{
							fontSize: '24px',
							color: '#64748b',
							fontFamily: 'monospace',
						}}
					>
						bottleneck.dev
					</p>
				</div>
			</div>

			{/* Animated background elements */}
			<BackgroundElements />
		</AbsoluteFill>
	);
};

interface FeaturePillProps {
	text: string;
	delay: number;
}

const FeaturePill: React.FC<FeaturePillProps> = ({text, delay}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const scale = spring({
		frame: frame - delay,
		fps,
		config: {
			damping: 100,
		},
	});

	return (
		<div
			style={{
				transform: `scale(${scale})`,
				background: 'rgba(255, 255, 255, 0.1)',
				backdropFilter: 'blur(10px)',
				padding: '10px 25px',
				borderRadius: '25px',
				border: '1px solid rgba(255, 255, 255, 0.2)',
			}}
		>
			<span
				style={{
					fontSize: '18px',
					color: '#e2e8f0',
					fontFamily: 'system-ui, -apple-system, sans-serif',
				}}
			>
				{text}
			</span>
		</div>
	);
};

const BackgroundElements: React.FC = () => {
	const frame = useCurrentFrame();

	return (
		<>
			{/* Floating particles */}
			{[...Array(5)].map((_, i) => {
				const angle = (i * 72) + frame * 2;
				const radius = 300 + Math.sin(frame * 0.05) * 50;
				const x = Math.cos(angle * Math.PI / 180) * radius;
				const y = Math.sin(angle * Math.PI / 180) * radius;

				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: '50%',
							top: '50%',
							transform: `translate(${x}px, ${y}px)`,
							width: '10px',
							height: '10px',
							background: 'rgba(139, 92, 246, 0.5)',
							borderRadius: '50%',
							filter: 'blur(2px)',
						}}
					/>
				);
			})}
		</>
	);
};