import { useEffect, useState } from 'react';
import { MOCK } from './api';
import { CopilotPanel } from './components/CopilotPanel';
import { Icon } from './components/ui';
import { DealPage } from './pages/DealPage';
import { NewBooking } from './pages/NewBooking';
import { Pipeline } from './pages/Pipeline';
import { Projects } from './pages/Projects';
import { DESKTOP, PHONE, useInstall, useMedia, useOnline } from './pwa';
import { useRoute } from './router';

export function App() {
  const route = useRoute();
  const isDesktop = useMedia(DESKTOP);
  const isPhone = useMedia(PHONE);
  // Docked open on desktop; an overlay (tablet) or full-screen sheet (phone) that starts closed elsewhere.
  // `#copilot` in the URL opens it on load (handy for demo screenshots).
  const [copilotOpen, setCopilotOpen] = useState(isDesktop || window.location.hash.includes('copilot'));
  const online = useOnline();
  const { canInstall, install, iosHint, dismissIosHint } = useInstall();
  const dealId = route.name === 'deal' ? route.id : undefined;

  useEffect(() => {
    if (isDesktop) setCopilotOpen(true);
  }, [isDesktop]);

  // Close the overlay copilot when navigating on small screens.
  useEffect(() => {
    if (!window.matchMedia(DESKTOP).matches && !window.location.hash.includes('copilot')) setCopilotOpen(false);
  }, [route.name, dealId]);

  // Lock page scroll behind the phone sheet.
  useEffect(() => {
    document.body.classList.toggle('sheet-open', isPhone && copilotOpen);
  }, [isPhone, copilotOpen]);

  const installButton = canInstall && (
    <button className="install-btn" onClick={install}>
      <Icon name="download" size={14} /> Install app
    </button>
  );

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
          <a className={route.name === 'pipeline' || route.name === 'deal' ? 'active' : ''} href="#/" title="Pipeline">
            <Icon name="pipeline" /> <span className="nav-text">Pipeline</span>
          </a>
          <a className={route.name === 'new' ? 'active' : ''} href="#/new" title="New booking">
            <Icon name="plus" /> <span className="nav-text">New booking</span>
          </a>
          <a className={route.name === 'projects' ? 'active' : ''} href="#/projects" title="Projects">
            <Icon name="building" /> <span className="nav-text">Projects</span>
          </a>
        </nav>
        {installButton && <div className="sidebar-install">{installButton}</div>}
        <div className="sidebar-foot">
          <span className="avatar">RO</span>
          <span className="nav-text">
            <strong>Rachel Ong</strong>
            <small>Sales agent</small>
          </span>
        </div>
        {MOCK && <div className="mock-flag">Demo data</div>}
      </aside>

      <header className="topbar">
        <a className="brand" href="#/">
          <span className="brand-mark">
            <Icon name="check" size={14} />
          </span>
          <span className="brand-name">Closing Copilot</span>
        </a>
        {MOCK && <span className="mock-pill">Demo data</span>}
        {installButton}
      </header>

      <main className="main">
        {!online && (
          <div className="offline-banner" role="status">
            <Icon name="offline" size={15} />
            <span>You're offline. Deal data isn't stored on this device, so it loads again when you reconnect.</span>
          </div>
        )}
        {route.name === 'pipeline' && <Pipeline />}
        {route.name === 'new' && <NewBooking />}
        {route.name === 'projects' && <Projects />}
        {route.name === 'deal' && <DealPage key={route.id} id={route.id} review={route.review} />}
      </main>

      {!copilotOpen && (
        <button className="copilot-fab" onClick={() => setCopilotOpen(true)}>
          <Icon name="spark" size={16} /> Ask Copilot
        </button>
      )}
      {copilotOpen && !isDesktop && !isPhone && <div className="copilot-scrim" onClick={() => setCopilotOpen(false)} />}
      <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} dealId={dealId} />

      {iosHint && !copilotOpen && (
        <div className="ios-hint" role="note">
          <span className="brand-mark">
            <Icon name="check" size={14} />
          </span>
          <p>
            Install the app: tap <Icon name="share" size={14} /> <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
          </p>
          <button className="icon-btn" onClick={dismissIosHint} aria-label="Dismiss install hint">
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      <nav className="tabbar" aria-label="Main">
        <a className={(route.name === 'pipeline' || route.name === 'deal') && !copilotOpen ? 'active' : ''} href="#/" onClick={() => setCopilotOpen(false)}>
          <Icon name="pipeline" size={20} />
          <span>Pipeline</span>
        </a>
        <a className={route.name === 'new' && !copilotOpen ? 'active' : ''} href="#/new" onClick={() => setCopilotOpen(false)}>
          <Icon name="plus" size={20} />
          <span>New booking</span>
        </a>
        <a className={route.name === 'projects' && !copilotOpen ? 'active' : ''} href="#/projects" onClick={() => setCopilotOpen(false)}>
          <Icon name="building" size={20} />
          <span>Projects</span>
        </a>
        <button className={copilotOpen ? 'active' : ''} onClick={() => setCopilotOpen((o) => !o)}>
          <Icon name="spark" size={20} />
          <span>Copilot</span>
        </button>
      </nav>
    </div>
  );
}
