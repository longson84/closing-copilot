import { useEffect, useState } from 'react';
import { MOCK } from './api';
import { CopilotPanel } from './components/CopilotPanel';
import { ASK_COPILOT } from './components/crm';
import { Icon } from './components/ui';
import { DealPage } from './pages/DealPage';
import { NewBooking } from './pages/NewBooking';
import { Pipeline } from './pages/Pipeline';
import { Projects } from './pages/Projects';
import { CustomerPage } from './pages/CustomerPage';
import { Customers, NewCustomer } from './pages/Customers';
import { Reminders, useReminderBadge } from './pages/Reminders';
import { WhatsAppImport } from './pages/WhatsAppImport';
import { AfterSales } from './pages/AfterSales';
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
  const [moreOpen, setMoreOpen] = useState(false);
  const { canInstall, install, iosHint, dismissIosHint } = useInstall();
  const dealId = route.name === 'deal' ? route.id : undefined;
  const customerId = route.name === 'customer' ? route.id : undefined;
  const remBadge = useReminderBadge(route.name);
  const inCustomers = route.name === 'customers' || route.name === 'customer' || route.name === 'customer-new' || route.name === 'whatsapp';
  const badge = remBadge > 0 && <span className="nav-badge">{remBadge}</span>;

  useEffect(() => {
    if (isDesktop) setCopilotOpen(true);
  }, [isDesktop]);

  // Close the overlay copilot when navigating on small screens.
  useEffect(() => {
    if (!window.matchMedia(DESKTOP).matches && !window.location.hash.includes('copilot')) setCopilotOpen(false);
  }, [route.name, dealId, route.name === 'customer' ? route.id : '']);

  useEffect(() => {
    const open = () => setCopilotOpen(true);
    window.addEventListener(ASK_COPILOT, open);
    return () => window.removeEventListener(ASK_COPILOT, open);
  }, []);

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
          <a className={inCustomers ? 'active' : ''} href="#/customers" title="Customers">
            <Icon name="user" /> <span className="nav-text">Customers</span>
          </a>
          <a className={route.name === 'reminders' ? 'active' : ''} href="#/reminders" title="Reminders">
            <span className="nav-icon">
              <Icon name="clock" />
              {badge}
            </span>{' '}
            <span className="nav-text">Reminders</span>
          </a>
          <a className={route.name === 'aftersales' ? 'active' : ''} href="#/aftersales" title="After-sales">
            <Icon name="key" /> <span className="nav-text">After-sales</span>
          </a>
          <a className={route.name === 'projects' ? 'active' : ''} href="#/projects" title="Projects">
            <Icon name="building" /> <span className="nav-text">Projects</span>
          </a>
          <a className={route.name === 'new' ? 'active' : ''} href="#/new" title="New booking">
            <Icon name="plus" /> <span className="nav-text">New booking</span>
          </a>
        </nav>
        {installButton && <div className="sidebar-install">{installButton}</div>}
        <div className="sidebar-foot">
          <span className="avatar">RL</span>
          <span className="nav-text">
            <strong>Rachel Lim</strong>
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
        {route.name === 'customers' && <Customers />}
        {route.name === 'customer-new' && <NewCustomer />}
        {route.name === 'customer' && <CustomerPage key={route.id} id={route.id} highlightNote={route.note} initialTab={route.tab} />}
        {route.name === 'whatsapp' && <WhatsAppImport key={route.customerId ?? 'none'} customerId={route.customerId} />}
        {route.name === 'reminders' && <Reminders />}
        {route.name === 'aftersales' && <AfterSales />}
        {route.name === 'deal' && <DealPage key={route.id} id={route.id} review={route.review} />}
      </main>

      {!copilotOpen && (
        <button className="copilot-fab" onClick={() => setCopilotOpen(true)}>
          <Icon name="spark" size={16} /> Ask Copilot
        </button>
      )}
      {copilotOpen && !isDesktop && !isPhone && <div className="copilot-scrim" onClick={() => setCopilotOpen(false)} />}
      <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} dealId={dealId} customerId={customerId} />

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

      {moreOpen && (
        <div className="dialog-backdrop" onClick={() => setMoreOpen(false)}>
          <div className="dialog more-sheet" role="dialog" aria-modal="true" aria-label="More" onClick={(e) => e.stopPropagation()}>
            {(
              [
                ['#/aftersales', 'key', 'After-sales', 'Tenancies, furnishing, tax'],
                ['#/projects', 'building', 'Projects', 'New launches catalog'],
                ['#/new', 'plus', 'New booking', 'Register a booking from an ID'],
              ] as const
            ).map(([href, icon, label, sub]) => (
              <a key={href} href={href} className="more-item" onClick={() => setMoreOpen(false)}>
                <span className="more-icon">
                  <Icon name={icon} size={18} />
                </span>
                <span>
                  <strong>{label}</strong>
                  <span className="cell-sub">{sub}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      <nav className="tabbar" aria-label="Main">
        <a className={(route.name === 'pipeline' || route.name === 'deal' || route.name === 'new') && !copilotOpen ? 'active' : ''} href="#/" onClick={() => setCopilotOpen(false)}>
          <Icon name="pipeline" size={20} />
          <span>Pipeline</span>
        </a>
        <a className={inCustomers && !copilotOpen ? 'active' : ''} href="#/customers" onClick={() => setCopilotOpen(false)}>
          <Icon name="user" size={20} />
          <span>Customers</span>
        </a>
        <a className={route.name === 'reminders' && !copilotOpen ? 'active' : ''} href="#/reminders" onClick={() => setCopilotOpen(false)}>
          <span className="nav-icon">
            <Icon name="clock" size={20} />
            {badge}
          </span>
          <span>Reminders</span>
        </a>
        <button
          className={(route.name === 'projects' || route.name === 'aftersales') && !copilotOpen ? 'active' : ''}
          onClick={() => {
            setCopilotOpen(false);
            setMoreOpen(true);
          }}
        >
          <Icon name="more" size={20} />
          <span>More</span>
        </button>
        <button className={copilotOpen ? 'active' : ''} onClick={() => setCopilotOpen((o) => !o)}>
          <Icon name="spark" size={20} />
          <span>Copilot</span>
        </button>
      </nav>
    </div>
  );
}
