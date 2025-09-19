import {AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {linearTiming, TransitionSeries} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {spring, interpolate} from 'remotion';

const Title: React.FC<{text: string; subtitle?: string}> = ({text, subtitle}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const appear = spring({fps, frame, config: {damping: 200}});
  const y = interpolate(appear, [0, 1], [40, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', backgroundColor: 'black'}}>
      <div
        style={{
          color: 'white',
          fontSize: 120,
          fontWeight: 800,
          letterSpacing: -2,
          transform: `translateY(${y}px)`,
          textAlign: 'center',
        }}
      >
        {text}
        {subtitle ? (
          <div style={{fontSize: 44, fontWeight: 600, marginTop: 24, opacity: 0.85}}>{subtitle}</div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

const FeatureCard: React.FC<{title: string; bullets: string[]}> = ({title, bullets}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const scale = interpolate(spring({fps, frame, config: {damping: 200}}), [0, 1], [0.96, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const opacity = interpolate(frame, [0, 15], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0F17'}}>
      <div
        style={{
          width: 1400,
          borderRadius: 24,
          background: 'linear-gradient(180deg, #121826 0%, #0B0F17 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
          padding: 64,
          transform: `scale(${scale})`,
          opacity,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24}}>
          <div style={{width: 16, height: 16, borderRadius: 999, background: '#6EE7B7'}} />
          <div style={{color: 'white', fontSize: 64, fontWeight: 800, letterSpacing: -1}}>{title}</div>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24}}>
          {bullets.map((b, i) => (
            <div
              key={i}
              style={{
                padding: 20,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16,
                color: 'white',
                fontSize: 34,
                lineHeight: 1.3,
              }}
            >
              {b}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Footer: React.FC<{cta: string}> = ({cta}) => {
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', pointerEvents: 'none'}}>
      <div style={{marginBottom: 48, color: 'white', opacity: 0.7, fontSize: 32}}>{cta}</div>
    </AbsoluteFill>
  );
};

export const Promo: React.FC = () => {
  return (
    <AbsoluteFill style={{backgroundColor: 'black'}}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={120}>
          <Title text="Bottleneck" subtitle="Code Review, supercharged for the AI codegen era" />
          <Footer cta="Lightning-fast PR review • Keyboard-first • Offline-ready" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={linearTiming({durationInFrames: 20})} presentation={fade()} />
        <TransitionSeries.Sequence durationInFrames={150}>
          <FeatureCard
            title="Review at 2x speed"
            bullets={[
              'Instant PR list, blazing diff rendering',
              'Prefix grouping to triage faster',
              'Bulk approve/label/merge with confidence',
              'Offline cache for flights and bad wifi',
            ]}
          />
          <Footer cta="Spend time on judgment, not waiting for UIs" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={linearTiming({durationInFrames: 20})} presentation={fade()} />
        <TransitionSeries.Sequence durationInFrames={120}>
          <FeatureCard
            title="Built for AI workflows"
            bullets={[
              'Agent-friendly: handle 1k+ files smoothly',
              'Fast keyboard nav across AI-generated changes',
              'Smart syncing with GitHub GraphQL',
              'Monaco-powered diffs with crisp highlighting',
            ]}
          />
          <Footer cta="Tame AI codegen noise. Focus on what matters." />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={linearTiming({durationInFrames: 20})} presentation={fade()} />
        <TransitionSeries.Sequence durationInFrames={120}>
          <Title text="Bottleneck" subtitle="Make Code Review way easier" />
          <Footer cta="Get started today" />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* Optional soundtrack from public/ if added later */}
      <Sequence from={0}>
        <Audio volume={0.25} src={staticFile('audio.mp3')} startFrom={0} endAt={450} />
      </Sequence>
    </AbsoluteFill>
  );
};

