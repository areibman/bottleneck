import {AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {Img, staticFile} from 'remotion';
import {spring} from 'remotion';

const features = [
  {
    title: 'Lightning-Fast Reviews',
    subtitle: 'AI summaries & inline suggestions',
  },
  {
    title: 'Seamless Integrations',
    subtitle: 'GitHub, GitLab & more',
  },
  {
    title: 'Actionable Insights',
    subtitle: 'Focus on what matters',
  },
];

const FeatureSlide: React.FC<{index: number; title: string; subtitle: string}> = ({index, title, subtitle}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const progress = spring({frame, fps, config: {damping: 200}});

  const opacity = interpolate(progress, [0, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const translateY = interpolate(progress, [0, 1], [40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        background: '#0d1117',
        color: 'white',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          textAlign: 'center',
        }}
      >
        <h1 style={{fontSize: 120, margin: 0}}>{title}</h1>
        <p style={{fontSize: 60, marginTop: 20, color: '#8b949e'}}>{subtitle}</p>
      </div>
    </AbsoluteFill>
  );
};

export const BottleneckPromo: React.FC = () => {
  const slideDuration = 60; // 2 seconds per slide at 30fps
  return (
    <AbsoluteFill>
      {/* Logo intro */}
      <Sequence durationInFrames={60}>
        <Intro />
      </Sequence>
      {features.map((f, i) => (
        <Sequence
          key={f.title}
          from={60 + i * slideDuration}
          durationInFrames={slideDuration}
        >
          <FeatureSlide index={i} title={f.title} subtitle={f.subtitle} />
        </Sequence>
      ))}
      {/* Outro */}
      <Sequence from={60 + features.length * slideDuration} durationInFrames={60}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const scale = spring({frame, fps, config: {mass: 1, damping: 100, stiffness: 200}});
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        background: '#0d1117',
      }}
    >
      <Img
        src={staticFile('logo.png')}
        style={{width: 400, height: 400, opacity, transform: `scale(${scale})`}}
      />
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const progress = spring({frame, fps, config: {damping: 200}});
  const opacity = interpolate(progress, [0, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const translateY = interpolate(progress, [0, 1], [40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        background: '#0d1117',
        color: 'white',
      }}
    >
      <div style={{opacity, transform: `translateY(${translateY}px)`, textAlign: 'center'}}>
        <h1 style={{fontSize: 100, margin: 0}}>Bottleneck</h1>
        <p style={{fontSize: 50, marginTop: 20, color: '#8b949e'}}>
          Make Code Review Effortless
        </p>
      </div>
    </AbsoluteFill>
  );
};