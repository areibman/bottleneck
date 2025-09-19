import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';

const Title: React.FC<{
  headline: string;
  sub?: string;
}> = ({headline, sub}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const translateY = interpolate(frame, [0, 30], [30, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <div style={{textAlign: 'center', opacity, transform: `translateY(${translateY}px)`}}>
        <div style={{fontSize: 84, fontWeight: 800}}>Bottleneck</div>
        <div style={{fontSize: 52, marginTop: 16}}>{headline}</div>
        {sub ? <div style={{fontSize: 32, marginTop: 16, opacity: 0.9}}>{sub}</div> : null}
      </div>
    </AbsoluteFill>
  );
};

const Feature: React.FC<{
  title: string;
  bullets: string[];
}> = ({title, bullets}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill style={{padding: 120, display: 'flex', flexDirection: 'column', gap: 32}}>
      <div style={{fontSize: 64, fontWeight: 700}}>{title}</div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 18, marginTop: 12}}>
        {bullets.map((b, i) => {
          const appear = i * Math.round(fps * 0.4);
          const local = Math.max(0, frame - appear);
          const opacity = interpolate(local, [0, 8], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const x = interpolate(local, [0, 15], [20, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 16, opacity, transform: `translateX(${x}px)`}}>
              <div style={{width: 14, height: 14, borderRadius: 999, background: '#22c55e'}} />
              <div style={{fontSize: 40}}>{b}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Footer: React.FC<{text: string}> = ({text}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end'}}>
      <div style={{padding: 40, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity}}>
        <div style={{fontSize: 28, opacity: 0.9}}>bottleneck.dev</div>
        <div style={{fontSize: 28, opacity: 0.9}}>{text}</div>
      </div>
    </AbsoluteFill>
  );
};

export const MyComp: React.FC = () => {
  const {durationInFrames} = useVideoConfig();

  return (
    <AbsoluteFill style={{background: 'linear-gradient(135deg, #0f172a 0%, #020617 100%)', color: 'white'}}>
      {/* Silent render by default to avoid remote audio 404s. Drop your track in public/audio/ambient.mp3 and switch to staticFile if desired. */}

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={120}>
          <Title headline="Code Review, Supercharged" sub="Built for the AI codegen era" />
          <Footer text="Make Code Review 10x faster" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={linearTiming({durationInFrames: 20})} presentation={fade()} />

        <TransitionSeries.Sequence durationInFrames={150}>
          <Feature
            title="Triage PRs in seconds"
            bullets={[
              'Smart summaries and risk highlights',
              'Auto-grouped changes by feature and file',
              'One-click deep dives into critical diffs',
            ]}
          />
          <Footer text="Focus on what matters" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={linearTiming({durationInFrames: 20})} presentation={fade()} />

        <TransitionSeries.Sequence durationInFrames={150}>
          <Feature
            title="AI-assisted review without the noise"
            bullets={[
              'Context-aware suggestions with source citations',
              'Explain complex diffs in plain language',
              'Catch regressions, style and security issues',
            ]}
          />
          <Footer text="Trustworthy, explainable help" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={linearTiming({durationInFrames: 20})} presentation={fade()} />

        <TransitionSeries.Sequence durationInFrames={140}>
          <Feature
            title="Ship confidently"
            bullets={[
              'Clear review checklists and status',
              'First-class GitHub integration',
              'Snappy keyboard-driven workflow',
            ]}
          />
          <Footer text="Less toil, more impact" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition timing={linearTiming({durationInFrames: 20})} presentation={fade()} />

        <TransitionSeries.Sequence durationInFrames={120}>
          <Title headline="Bottleneck" sub="Make Code Review way easier" />
          <Footer text="Try it today" />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

