import React from 'react';

export function Sidebar() {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <h2 style={{ margin: 0, fontSize: 16 }}>Bottleneck</h2>
      <div style={{ display: 'grid', gap: 4 }}>
        <strong>Repos</strong>
        <div className="list">
          <div className="card">example/repo</div>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 4 }}>
        <strong>Branches</strong>
        <div className="list">
          <div className="card">main</div>
          <div className="card">develop</div>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 4 }}>
        <strong>Saved Filters</strong>
        <div className="list">
          <div className="card">Assigned to me</div>
          <div className="card">Needs my review</div>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 4 }}>
        <strong>Groups</strong>
        <div className="list">
          <div className="card">agent/*</div>
          <div className="card">chore/lint-*</div>
        </div>
      </div>
    </div>
  );
}

