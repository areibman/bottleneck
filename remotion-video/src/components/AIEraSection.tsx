import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, interpolate, spring, useVideoConfig} from 'remotion';

export const AIEraSection: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	// Main title animation
	const titleScale = spring({
		frame,
		fps,
		config: {
			damping: 100,
		},
	});

	const titleOpacity = interpolate(
		frame,
		[0, 20],
		[0, 1],
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
			{/* Main Title */}
			<div
				style={{
					position: 'absolute',
					top: '15%',
					opacity: titleOpacity,
					transform: `scale(${titleScale})`,
				}}
			>
				<h2
					style={{
						fontSize: '64px',
						fontWeight: 'bold',
						color: 'white',
						textAlign: 'center',
						fontFamily: 'system-ui, -apple-system, sans-serif',
						letterSpacing: '-1px',
						textShadow: '0 4px 20px rgba(0,0,0,0.5)',
					}}
				>
					Built for the AI Codegen Era
				</h2>
			</div>

			{/* AI Features */}
			<Sequence from={30} durationInFrames={120}>
				<AIFeatures />
			</Sequence>

			{/* Code Generation Visual */}
			<Sequence from={20} durationInFrames={130}>
				<CodeGenerationVisual />
			</Sequence>
		</AbsoluteFill>
	);
};

const AIFeatures: React.FC = () => {
	const frame = useCurrentFrame();
	
	const features = [
		"Handle massive AI-generated diffs with ease",
		"Smart context-aware review suggestions",
		"Instant navigation through generated code",
		"Batch review AI commits efficiently",
	];

	return (
		<div
			style={{
				position: 'absolute',
				top: '35%',
				width: '80%',
				left: '10%',
			}}
		>
			{features.map((feature, index) => {
				const delay = index * 15;
				const opacity = interpolate(
					frame - delay,
					[0, 20],
					[0, 1],
					{
						extrapolateLeft: 'clamp',
						extrapolateRight: 'clamp',
					}
				);

				const slideX = interpolate(
					frame - delay,
					[0, 20],
					[-50, 0],
					{
						extrapolateLeft: 'clamp',
						extrapolateRight: 'clamp',
					}
				);

				return (
					<div
						key={index}
						style={{
							opacity,
							transform: `translateX(${slideX}px)`,
							marginBottom: '20px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<span
							style={{
								fontSize: '28px',
								color: '#10b981',
								marginRight: '15px',
							}}
						>
							✓
						</span>
						<span
							style={{
								fontSize: '24px',
								color: '#e2e8f0',
								fontFamily: 'system-ui, -apple-system, sans-serif',
							}}
						>
							{feature}
						</span>
					</div>
				);
			})}
		</div>
	);
};

const CodeGenerationVisual: React.FC = () => {
	const frame = useCurrentFrame();
	
	// Simulated code generation animation
	const codeLines = [
		'function processData(input) {',
		'  const result = input.map(item => {',
		'    return transformItem(item);',
		'  });',
		'  return optimizeResult(result);',
		'}',
		'',
		'async function fetchAndProcess() {',
		'  const data = await fetchData();',
		'  return processData(data);',
		'}',
	];

	return (
		<div
			style={{
				position: 'absolute',
				bottom: '10%',
				left: '50%',
				transform: 'translateX(-50%)',
				background: 'rgba(0, 0, 0, 0.5)',
				backdropFilter: 'blur(10px)',
				border: '1px solid rgba(255, 255, 255, 0.1)',
				borderRadius: '12px',
				padding: '20px',
				width: '600px',
			}}
		>
			<div
				style={{
					fontFamily: 'monospace',
					fontSize: '14px',
					color: '#cbd5e1',
				}}
			>
				{codeLines.map((line, index) => {
					const charCount = Math.floor(interpolate(
						frame - index * 3,
						[0, 30],
						[0, line.length],
						{
							extrapolateLeft: 'clamp',
							extrapolateRight: 'clamp',
						}
					));

					return (
						<div
							key={index}
							style={{
								marginBottom: '4px',
								minHeight: '20px',
							}}
						>
							<span style={{color: '#60a5fa'}}>
								{line.slice(0, charCount)}
							</span>
							{charCount < line.length && (
								<span
									style={{
										borderRight: '2px solid #60a5fa',
										animation: 'blink 1s infinite',
									}}
								/>
							)}
						</div>
					);
				})}
			</div>

			{/* AI Badge */}
			<div
				style={{
					position: 'absolute',
					top: '-15px',
					right: '20px',
					background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
					padding: '5px 15px',
					borderRadius: '20px',
					fontSize: '12px',
					color: 'white',
					fontWeight: 'bold',
					fontFamily: 'system-ui, -apple-system, sans-serif',
				}}
			>
				AI Generated
			</div>
		</div>
	);
};