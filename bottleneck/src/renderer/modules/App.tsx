import React from 'react';
import { Sidebar } from '../ui/Sidebar';
import { Topbar } from '../ui/Topbar';
import { PRList } from './pr/PRList';
import { PRDetail } from './pr/PRDetail';
import { useAppStore } from './state/appStore';

export default function App() {
  const selectedPr = useAppStore(s => s.selectedPr);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr' }}>
      <aside className="sidebar"><Sidebar /></aside>
      <section className="main">
        <div className="topbar"><Topbar /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr' }}>
          <div style={{ borderRight: '1px solid var(--border)', overflow: 'auto' }}><PRList /></div>
          <div style={{ minWidth: 0 }}><PRDetail pr={selectedPr} /></div>
        </div>
      </section>
    </div>
  );
}

