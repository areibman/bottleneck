import React from 'react';
import { useAppStore } from '../modules/state/appStore';

export function Topbar() {
  const filter = useAppStore(s => s.filter);
  const setFilter = useAppStore(s => s.setFilter);
  const [auth, setAuth] = React.useState<'signed_out'|'pending'|'signed_in'>('signed_out');
  const [userCode, setUserCode] = React.useState<string>('');
  const [verifyUrl, setVerifyUrl] = React.useState<string>('');

  const startAuth = async () => {
    setAuth('pending');
    const res = await window.api.auth.startDevice();
    if (res && !('error' in res)) {
      setUserCode(res.user_code);
      setVerifyUrl(res.verification_uri);
      window.api.openExternal(res.verification_uri);
    }
  };

  return (
    <>
      <input placeholder="Search PRs" value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 300 }} />
      <span className="badge">Sync: idle</span>
      {auth !== 'signed_in' ? (
        <button onClick={startAuth}>Sign in</button>
      ) : (
        <span className="badge">Signed in</span>
      )}
      {auth === 'pending' && userCode && (
        <span className="badge">Code: {userCode}</span>
      )}
      <div style={{ marginLeft: 'auto' }} />
      <span className="badge">Account</span>
    </>
  );
}

