import React from 'react';

const App: React.FC = () => {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <aside style={{ width: 240, background: '#20232a', color: 'white', padding: 8 }}>
        <h2>Repos</h2>
        {/* TODO: repo list */}
      </aside>
      <main style={{ flex: 1, padding: 16 }}>
        <h1>Bottleneck</h1>
        <p>Welcome! Authenticate to start.</p>
        <button onClick={() => (window as any).api.githubOAuth()}>Sign in with GitHub</button>
      </main>
    </div>
  );
};

export default App;