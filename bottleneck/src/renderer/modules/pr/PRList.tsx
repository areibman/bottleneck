import React from 'react';
import { useAppStore } from '../state/appStore';
import { groupByPrefix } from '@shared/grouping';

export function PRList() {
  const prs = useAppStore(s => s.prs);
  const filter = useAppStore(s => s.filter);
  const select = useAppStore(s => s.selectPr);

  const filtered = React.useMemo(() => prs.filter(p => p.title.toLowerCase().includes(filter.toLowerCase())), [prs, filter]);
  const grouped = React.useMemo(() => groupByPrefix(filtered), [filtered]);

  return (
    <div style={{ padding: 10, display: 'grid', gap: 10 }}>
      <div className="row">
        <span className="badge">{filtered.length} PRs</span>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {Array.from(grouped.entries()).map(([group, items]) => (
          <div key={group} className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}><strong>{group}</strong><span className="badge">{items.length}</span></div>
            <div className="list">
              {items.map(pr => (
                <div key={pr.id} className="card" onClick={() => select(pr)} style={{ cursor: 'pointer' }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <div>#{pr.number} {pr.title}</div>
                    <span className="badge">{pr.state}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

