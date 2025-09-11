import React from 'react';
import Editor from '@monaco-editor/react';
import type { PR } from '../state/appStore';

type Props = { pr: PR | null };

export function PRDetail({ pr }: Props) {
  const [tab, setTab] = React.useState<'conversation' | 'files'>('conversation');
  if (!pr) return <div style={{ padding: 12 }}>Select a PR to view details.</div>;
  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: 'calc(100vh - 44px)' }}>
      <div className="tabs">
        <div className={tab === 'conversation' ? 'tab active' : 'tab'} onClick={() => setTab('conversation')}>Conversation</div>
        <div className={tab === 'files' ? 'tab active' : 'tab'} onClick={() => setTab('files')}>Files</div>
      </div>
      {tab === 'conversation' ? <ConversationTab pr={pr} /> : <FilesTab />}
    </div>
  );
}

function ConversationTab({ pr }: { pr: PR }) {
  return (
    <div style={{ padding: 12, display: 'grid', gap: 8 }}>
      <h3 style={{ margin: 0 }}>#{pr.number} {pr.title}</h3>
      <div className="row" style={{ gap: 12 }}>
        <button>Approve</button>
        <button>Request Changes</button>
        <button>Comment</button>
        <button style={{ marginLeft: 'auto' }}>Merge</button>
      </div>
      <div className="card">Conversation timeline (stub)</div>
    </div>
  );
}

function FilesTab() {
  return (
    <div className="split">
      <div className="filelist">
        <div className="card">
          <div><strong>Changed files</strong></div>
          <ul>
            <li>src/index.tsx</li>
            <li>src/app.ts</li>
          </ul>
        </div>
      </div>
      <div className="fileview">
        <Editor height="100%" defaultLanguage="diff" theme="vs-dark" value={sample} options={{ readOnly: true, minimap: { enabled: false } }} />
      </div>
    </div>
  );
}

const sample = `diff --git a/src/index.tsx b/src/index.tsx
index 12ab..34cd 100644
--- a/src/index.tsx
+++ b/src/index.tsx
@@ -1,5 +1,7 @@
-import React from 'react'
+import React from 'react'
+// Example inline comment anchor
 export function App() {
-  return <div>Hello</div>
+  return <div>Hello, world</div>
 }`;

