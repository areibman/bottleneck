import React from 'react';
import {
	AbsoluteFill,
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	spring,
	Sequence,
	Series,
} from 'remotion';
import { TransitionSeries, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';

export const BottleneckPromo: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	// Animation values
	const titleScale = spring({
		fps,
		frame: frame - 30,
		config: {
			damping: 200,
		},
	});

	const subtitleOpacity = interpolate(frame, [60, 90], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
			<TransitionSeries>
				{/* Title Screen */}
				<TransitionSeries.Sequence durationInFrames={120}>
					<AbsoluteFill style={{ 
						display: 'flex', 
						flexDirection: 'column', 
						justifyContent: 'center', 
						alignItems: 'center',
						color: 'white',
						fontFamily: 'Arial, sans-serif'
					}}>
						<div style={{
							fontSize: 120,
							fontWeight: 'bold',
							textAlign: 'center',
							transform: `scale(${titleScale})`,
							marginBottom: 40,
							textShadow: '0 4px 8px rgba(0,0,0,0.3)'
						}}>
							Bottleneck
						</div>
						<div style={{
							fontSize: 36,
							opacity: subtitleOpacity,
							textAlign: 'center',
							maxWidth: 800,
							lineHeight: 1.4,
							textShadow: '0 2px 4px rgba(0,0,0,0.3)'
						}}>
							Make Code Review Way Easier in the AI Codegen Era
						</div>
					</AbsoluteFill>
				</TransitionSeries.Sequence>

				<TransitionSeries.Transition
					timing={springTiming({ config: { damping: 200 } })}
					presentation={fade()}
				/>

				{/* Features Section */}
				<TransitionSeries.Sequence durationInFrames={300}>
					<FeaturesSection />
				</TransitionSeries.Sequence>

				<TransitionSeries.Transition
					timing={springTiming({ config: { damping: 200 } })}
					presentation={fade()}
				/>

				{/* Performance Section */}
				<TransitionSeries.Sequence durationInFrames={300}>
					<PerformanceSection />
				</TransitionSeries.Sequence>

				<TransitionSeries.Transition
					timing={springTiming({ config: { damping: 200 } })}
					presentation={fade()}
				/>

				{/* Call to Action */}
				<TransitionSeries.Sequence durationInFrames={180}>
					<CallToAction />
				</TransitionSeries.Sequence>
			</TransitionSeries>
		</AbsoluteFill>
	);
};

const FeaturesSection: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const slideIn = spring({
		fps,
		frame: frame - 30,
		config: {
			damping: 200,
		},
	});

	const features = [
		{ icon: '⚡', title: 'Lightning Fast', desc: 'Near-instant navigation and diff rendering' },
		{ icon: '🔄', title: 'Smart Sync', desc: 'Incremental updates with intelligent caching' },
		{ icon: '👥', title: 'Bulk Actions', desc: 'Multi-select PRs for batch operations' },
		{ icon: '🏷️', title: 'Prefix Grouping', desc: 'Auto-groups PRs by common prefixes' },
		{ icon: '📝', title: 'Monaco Editor', desc: 'VSCode-powered diff viewer' },
		{ icon: '⌨️', title: 'Keyboard First', desc: 'Comprehensive shortcuts for power users' },
	];

	return (
		<AbsoluteFill style={{ 
			background: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'center',
			alignItems: 'center',
			padding: 100,
		}}>
			<div style={{
				fontSize: 80,
				fontWeight: 'bold',
				color: 'white',
				marginBottom: 60,
				textAlign: 'center',
				textShadow: '0 4px 8px rgba(0,0,0,0.3)',
				transform: `translateY(${(1 - slideIn) * 100}px)`,
			}}>
				Key Features
			</div>
			
			<div style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(3, 1fr)',
				gap: 40,
				maxWidth: 1400,
			}}>
				{features.map((feature, index) => {
					const itemSlideIn = spring({
						fps,
						frame: frame - 60 - (index * 10),
						config: {
							damping: 200,
						},
					});

					return (
						<div
							key={index}
							style={{
								background: 'rgba(255, 255, 255, 0.1)',
								backdropFilter: 'blur(10px)',
								borderRadius: 20,
								padding: 30,
								textAlign: 'center',
								color: 'white',
								transform: `translateY(${(1 - itemSlideIn) * 50}px)`,
								opacity: itemSlideIn,
								border: '1px solid rgba(255, 255, 255, 0.2)',
							}}
						>
							<div style={{ fontSize: 48, marginBottom: 20 }}>
								{feature.icon}
							</div>
							<div style={{ 
								fontSize: 24, 
								fontWeight: 'bold', 
								marginBottom: 10 
							}}>
								{feature.title}
							</div>
							<div style={{ 
								fontSize: 16, 
								opacity: 0.9,
								lineHeight: 1.4 
							}}>
								{feature.desc}
							</div>
						</div>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};

const PerformanceSection: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const slideIn = spring({
		fps,
		frame: frame - 30,
		config: {
			damping: 200,
		},
	});

	const metrics = [
		{ label: 'PR List Render', value: '<300ms', desc: 'from cache' },
		{ label: 'First Diff Paint', value: '<150ms', desc: 'typical files' },
		{ label: 'Handle Files', value: '1k+ files', desc: '50k+ lines smoothly' },
		{ label: 'Scrolling', value: '60 FPS', desc: 'in all views' },
	];

	return (
		<AbsoluteFill style={{ 
			background: 'linear-gradient(135deg, #8e44ad 0%, #e74c3c 100%)',
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'center',
			alignItems: 'center',
			padding: 100,
		}}>
			<div style={{
				fontSize: 80,
				fontWeight: 'bold',
				color: 'white',
				marginBottom: 60,
				textAlign: 'center',
				textShadow: '0 4px 8px rgba(0,0,0,0.3)',
				transform: `translateY(${(1 - slideIn) * 100}px)`,
			}}>
				Performance Targets
			</div>
			
			<div style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(2, 1fr)',
				gap: 40,
				maxWidth: 1000,
			}}>
				{metrics.map((metric, index) => {
					const itemSlideIn = spring({
						fps,
						frame: frame - 60 - (index * 15),
						config: {
							damping: 200,
						},
					});

					return (
						<div
							key={index}
							style={{
								background: 'rgba(255, 255, 255, 0.1)',
								backdropFilter: 'blur(10px)',
								borderRadius: 20,
								padding: 40,
								textAlign: 'center',
								color: 'white',
								transform: `translateX(${(1 - itemSlideIn) * (index % 2 === 0 ? -100 : 100)}px)`,
								opacity: itemSlideIn,
								border: '1px solid rgba(255, 255, 255, 0.2)',
							}}
						>
							<div style={{ 
								fontSize: 48, 
								fontWeight: 'bold', 
								marginBottom: 10,
								color: '#f39c12'
							}}>
								{metric.value}
							</div>
							<div style={{ 
								fontSize: 20, 
								fontWeight: 'bold', 
								marginBottom: 5 
							}}>
								{metric.label}
							</div>
							<div style={{ 
								fontSize: 16, 
								opacity: 0.9 
							}}>
								{metric.desc}
							</div>
						</div>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};

const CallToAction: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const pulse = interpolate(
		Math.sin((frame / 10) * Math.PI * 2),
		[-1, 1],
		[1, 1.1],
		{
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}
	);

	const fadeIn = interpolate(frame, [0, 60], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill style={{ 
			background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'center',
			alignItems: 'center',
			color: 'white',
			fontFamily: 'Arial, sans-serif',
		}}>
			<div style={{
				fontSize: 80,
				fontWeight: 'bold',
				textAlign: 'center',
				marginBottom: 40,
				textShadow: '0 4px 8px rgba(0,0,0,0.3)',
				opacity: fadeIn,
			}}>
				Ready to Speed Up Your Reviews?
			</div>
			
			<div style={{
				fontSize: 36,
				textAlign: 'center',
				marginBottom: 60,
				opacity: fadeIn * 0.9,
				maxWidth: 800,
				lineHeight: 1.4,
			}}>
				Join the future of code review with Bottleneck
			</div>

			<div style={{
				background: 'rgba(255, 255, 255, 0.2)',
				backdropFilter: 'blur(10px)',
				borderRadius: 50,
				padding: '20px 60px',
				fontSize: 32,
				fontWeight: 'bold',
				textAlign: 'center',
				border: '2px solid rgba(255, 255, 255, 0.3)',
				transform: `scale(${pulse})`,
				opacity: fadeIn,
				cursor: 'pointer',
				transition: 'all 0.3s ease',
			}}>
				Get Started Today
			</div>

			<div style={{
				fontSize: 24,
				textAlign: 'center',
				marginTop: 40,
				opacity: fadeIn * 0.8,
			}}>
				github.com/yourusername/bottleneck
			</div>
		</AbsoluteFill>
	);
};