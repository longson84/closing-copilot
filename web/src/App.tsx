import { useState } from 'react';
import { MOCK } from './api';
import { CopilotPanel } from './components/CopilotPanel';
import { Icon } from './components/ui';
import { DealPage } from './pages/DealPage';
import { NewBooking } from './pages/NewBooking';
import { Pipeline } from './pages/Pipeline';
import { useRoute } from './router';

export function App() {
  const route = useRoute();
  const [copilotOpen, setCopilotOpen] = useState(true);
  const dealId = route.name === 'deal' ? route.id : undefined;

  return (
    <div className={`shell${copilotOpen ? ' with-copilot' : ''}`}>
      <aside className="sidebar">
        <a className="brand" href="#/">
          <span className="brand-mark">
            <Icon name="check" size={16} />
          </span>
          <span className="brand-name">Closing Copilot</span>
        </a>
        <nav className="nav">
          <a className={route.name !== 'new' ? 'active' : ''} href="#/">
            <Icon name="pipeline" /> Pipeline
          </a>
          <a className={route.name === 'new' ? 'active' : ''} href="#/new">
            <Icon name="plus" /> New booking
          </a>
        </nav>
        <div className="sidebar-foot">
          <span className="avatar">RO</span>
          <span>
            <strong>Rachel Ong</strong>
            <small>Sales agent</small>
          </span>
        </div>
        {MOCK && <div className="mock-flag">Demo data</div>}
      </aside>

      <main className="main">
        {route.name === 'pipeline' && <Pipeline />}
        {route.name === 'new' && <NewBooking />}
        {route.name === 'deal' && <DealPage key={route.id} id={route.id} review={route.review} />}
      </main>

      {!copilotOpen && (
        <button className="copilot-fab" onClick={() => setCopilotOpen(true)}>
          <Icon name="spark" size={16} /> Ask Copilot
        </button>
      )}
      <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} dealId={dealId} />
    </div>
  );
}
