import { useState } from 'react';
import ThesisAgentRoom from './ThesisAgentRoom';
import SpaceEconomyDashboard from './SpaceEconomyDashboard';

export default function App() {
  const [view, setView] = useState('space');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#04060d' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
        background: '#02030a', borderBottom: '1px solid #1f2a44', fontFamily: 'system-ui',
      }}>
        <TabBtn active={view === 'space'} onClick={() => setView('space')}>Space Economy</TabBtn>
        <TabBtn active={view === 'thesis'} onClick={() => setView('thesis')}>Thesis Agent Room</TabBtn>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {view === 'space' ? <SpaceEconomyDashboard /> : <ThesisAgentRoom />}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: active ? '#0d1424' : 'transparent',
      color: active ? '#5cd5ff' : '#8595b5',
      border: `1px solid ${active ? '#2d3a5a' : 'transparent'}`,
      borderBottom: 'none',
      padding: '6px 14px',
      borderRadius: '6px 6px 0 0',
      cursor: 'pointer',
      fontSize: 12,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      fontWeight: 600,
    }}>
      {children}
    </button>
  );
}
