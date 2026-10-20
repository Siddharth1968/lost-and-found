import { useEffect, useRef, useState } from 'react';
import { animate, motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock3,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  api,
  date,
  friendly,
  type Claim,
  type Dashboard as DashboardData,
  type Item,
  type Notification,
} from '../api';
import { useApi, useAuth, useToast } from '../hooks';
import { Badge, Empty, ErrorState, ItemCard, Loading, PageIntro, Pagination } from '../components';
import './WorkspaceCreative.css';

export function DashboardNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!ref.current) return;
    if (reducedMotion) {
      ref.current.textContent = value.toLocaleString();
      return;
    }
    const animation = animate(0, value, {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (current) => {
        if (ref.current) ref.current.textContent = Math.round(current).toLocaleString();
      },
    });
    return () => animation.stop();
  }, [value, reducedMotion]);
  return <span ref={ref}>{value.toLocaleString()}</span>;
}

export function Dashboard() {
  const { user } = useAuth();
  const reducedMotion = useReducedMotion();
  const r = useApi<DashboardData>('/dashboard');
  const items = useApi<Item[]>('/items?mine=true&pageSize=3');
  const total = r.data?.total ?? 0;
  const composition = r.data
    ? [
        { label: 'Open lost', value: r.data.lost, color: '#FF6584' },
        { label: 'Open found', value: r.data.found, color: '#335CFF' },
        { label: 'Returned', value: r.data.returned, color: '#8B5CF6' },
        {
          label: 'Other statuses',
          value: Math.max(0, total - r.data.lost - r.data.found - r.data.returned),
          color: '#C8C9D4',
        },
      ]
    : [];
  const circumference = 2 * Math.PI * 67;
  let segmentOffset = 0;
  return (
    <div className="cf-dashboard-shell">
      <PageIntro
        eyebrow="YOUR LITTLE CORNER OF CAMPUS"
        title={`Hey, ${user?.fullName.replace('[Demo] ', '').split(' ')[0]}. Good to see you.`}
        description="Big campus. Small acts of kindness. Here’s the difference you’re making."
      >
        <Link to="/report/found" className="button primary small">
          <Plus size={17} />
          Report an item
        </Link>
      </PageIntro>
      {r.loading ? (
        <Loading />
      ) : r.error ? (
        <ErrorState message={r.error} />
      ) : (
        r.data && (
          <>
            <motion.section
              className="cf-dashboard-hero"
              initial={reducedMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              aria-labelledby="cf-dashboard-impact-title"
            >
              <div className="cf-dashboard-hero-copy">
                <span className="cf-dashboard-kicker">
                  <Sparkles size={14} /> THE GOOD YOU PUT OUT
                </span>
                <h2 id="cf-dashboard-impact-title">
                  A little kindness.
                  <br />
                  <em>A big ripple.</em>
                </h2>
                <p>Your listings connect the dots between a lost thing and a very happy person.</p>
                <Link to="/report/found" className="cf-dashboard-hero-link">
                  Keep the good going <ArrowUpRight size={18} />
                </Link>
              </div>
              <div
                className="cf-dashboard-impact"
                aria-label={`${r.data.returned} of your ${total} reported items have been returned`}
              >
                <div className="cf-dashboard-orbit" aria-hidden="true">
                  <span />
                  <span />
                  <Sparkles size={32} />
                </div>
                <strong>
                  <DashboardNumber value={r.data.returned} />
                </strong>
                <span>
                  items back where
                  <br />
                  they belong
                </span>
                <span className="cf-dashboard-impact-note">Your completed reunions</span>
              </div>
            </motion.section>
            <div className="dashboard-stats cf-dashboard-stats">
              {[
                { label: 'Items reported', value: total, icon: Package, tone: 'blue' },
                { label: 'Open lost items', value: r.data.lost, icon: Search, tone: 'coral' },
                {
                  label: 'Open found items',
                  value: r.data.found,
                  icon: CheckCircle2,
                  tone: 'lime',
                },
                { label: 'Pending claims', value: r.data.pending, icon: Clock3, tone: 'violet' },
              ].map(({ label, value, icon: Icon, tone }, index) => (
                <motion.div
                  className={`cf-dashboard-stat cf-dashboard-tone-${tone}`}
                  key={label}
                  initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06, duration: 0.4 }}
                >
                  <div>
                    <span>{label}</span>
                    <Icon size={19} />
                  </div>
                  <strong>
                    <DashboardNumber value={value} />
                  </strong>
                  <small>
                    {label === 'Pending claims'
                      ? 'Awaiting an ownership review'
                      : 'From your campus activity'}
                  </small>
                </motion.div>
              ))}
            </div>
            <section
              className="cf-dashboard-composition"
              aria-labelledby="cf-dashboard-composition-title"
            >
              <div className="cf-dashboard-chart-copy">
                <span className="cf-dashboard-kicker">THE FULL PICTURE</span>
                <h2 id="cf-dashboard-composition-title">Every report has a story.</h2>
                <p>A live snapshot of your listings. The next happy ending could be yours.</p>
                <Link to="/my-items" className="text-link">
                  Explore your listings <ArrowRight size={16} />
                </Link>
              </div>
              <figure
                className="cf-dashboard-ring-chart"
                aria-label={`Your report breakdown: ${composition.map((segment) => `${segment.value} ${segment.label.toLowerCase()}`).join(', ')}`}
              >
                <svg viewBox="0 0 168 168" aria-hidden="true">
                  <circle cx="84" cy="84" r="67" fill="none" stroke="#ECEAF0" strokeWidth="16" />
                  {composition.map((segment) => {
                    const length = total > 0 ? (segment.value / total) * circumference : 0;
                    const offset = segmentOffset;
                    segmentOffset += length;
                    return (
                      <motion.circle
                        key={segment.label}
                        cx="84"
                        cy="84"
                        r="67"
                        fill="none"
                        stroke={segment.color}
                        strokeWidth="16"
                        strokeDasharray={`${length} ${circumference - length}`}
                        strokeDashoffset={-offset}
                        transform="rotate(-90 84 84)"
                        initial={reducedMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.15 }}
                      />
                    );
                  })}
                  <text x="84" y="83" textAnchor="middle" className="cf-dashboard-ring-number">
                    {total}
                  </text>
                  <text x="84" y="103" textAnchor="middle" className="cf-dashboard-ring-label">
                    YOUR REPORTS
                  </text>
                </svg>
              </figure>
              <ul className="cf-dashboard-chart-legend">
                {composition.map((segment) => (
                  <li key={segment.label}>
                    <span style={{ background: segment.color }} />
                    <span>{segment.label}</span>
                    <strong>{segment.value}</strong>
                  </li>
                ))}
                <li className="cf-dashboard-chart-footnote">
                  Other statuses include verified and withdrawn listings.
                </li>
              </ul>
            </section>
            <div className="quick-actions cf-dashboard-quick-actions">
              <Link to="/report/lost">
                <span className="quick-icon orange">
                  <Search size={25} />
                </span>
                <div>
                  <h3>Missing something?</h3>
                  <p>Let the community help you find it.</p>
                </div>
                <ArrowUpRight size={21} />
              </Link>
              <Link to="/report/found">
                <span className="quick-icon green">
                  <Package size={25} />
                </span>
                <div>
                  <h3>Found a little something?</h3>
                  <p>Be the reason it makes its way home.</p>
                </div>
                <ArrowUpRight size={21} />
              </Link>
            </div>
            <div className="section-heading dashboard-heading">
              <h2>Your recent listings</h2>
              <Link to="/my-items" className="text-link">
                View all
                <ArrowRight size={16} />
              </Link>
            </div>
            {items.loading ? (
              <Loading />
            ) : items.error ? (
              <ErrorState message={items.error} />
            ) : items.data?.length ? (
              <div className="items-grid dashboard-items">
                {items.data.map((i) => (
                  <ItemCard item={i} key={i.id} />
                ))}
              </div>
            ) : (
              <Empty
                title="Your first act of kindness starts here"
                text="Report a lost or found item to see it in your dashboard."
              />
            )}
            <section className="panel activity-panel cf-dashboard-activity">
              <div className="panel-title">
                <div>
                  <span className="cf-dashboard-kicker">YOUR CAMPUS FOOTPRINT</span>
                  <h3>Little moments. Real impact.</h3>
                </div>
                <Clock3 size={18} />
              </div>
              {r.data.activity.length ? (
                r.data.activity.map((a) => (
                  <div className="activity-row" key={a.id}>
                    <span className="activity-dot" />
                    <div>
                      <strong>{friendly(a.action)}</strong>
                      <span>
                        {friendly(a.entityType)} #{a.entityId}
                      </span>
                    </div>
                    <time>{date(a.createdAt)}</time>
                  </div>
                ))
              ) : (
                <p className="subtle">
                  Your campus story is just getting started. Activity will appear here.
                </p>
              )}
            </section>
          </>
        )
      )}
    </div>
  );
}
export function MyItems() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [rev, setRev] = useState(0);
  const [confirm, setConfirm] = useState<number>();
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const r = useApi<Item[]>(
    `/items?mine=true&page=${page}${status ? `&status=${status}` : ''}`,
    rev,
  );
  async function withdraw(itemId: number) {
    setBusy(true);
    try {
      await api(`/items/${itemId}`, { method: 'DELETE' });
      toast('Listing withdrawn. Its history has been preserved.');
      setConfirm(undefined);
      setRev((v) => v + 1);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="cf-dashboard-shell cf-dashboard-listings">
      <PageIntro
        eyebrow="THE THINGS YOU’VE SHARED"
        title="My listings."
        description="Every report is a chance to make someone’s day."
      >
        <Link to="/report/lost" className="button primary small">
          <Plus size={16} />
          New listing
        </Link>
      </PageIntro>
      <div className="section-toolbar">
        <label className="filter-label">
          Show{' '}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="VERIFIED">Verified</option>
            <option value="RETURNED">Returned</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </select>
        </label>
        <span className="subtle">{r.meta?.total ?? '—'} listings</span>
      </div>
      {r.loading ? (
        <Loading />
      ) : r.error ? (
        <ErrorState message={r.error} />
      ) : !r.data?.length ? (
        <Empty
          title="No listings here yet"
          text="Report something you lost or found to get started."
        />
      ) : (
        <div className="my-items-list">
          {r.data.map((item) => (
            <div className="panel my-item" key={item.id}>
              <div className="my-item-head">
                <Badge value={item.type} />
                <Badge value={item.status} />
                <span>{date(item.createdAt)}</span>
              </div>
              <Link to={`/items/${item.id}`}>
                <h3>{item.title}</h3>
              </Link>
              <p>
                {item.location} · {item.category.name}
              </p>
              <div className="item-manage-actions">
                <Link className="button secondary small" to={`/items/${item.id}`}>
                  View details
                  <ArrowUpRight size={14} />
                </Link>
                {item.status === 'OPEN' && (
                  <>
                    <Link to={`/items/${item.id}/edit`} className="button text-button small">
                      Edit
                    </Link>
                    <button
                      className="reset-button danger-text"
                      onClick={() => setConfirm(item.id)}
                    >
                      Withdraw
                    </button>
                  </>
                )}
              </div>
              {confirm === item.id && (
                <div className="inline-confirm">
                  <p>
                    Withdraw this listing? It will leave the public noticeboard. Listings with
                    pending claims need administrator review.
                  </p>
                  <button
                    className="button danger small"
                    disabled={busy}
                    onClick={() => withdraw(item.id)}
                  >
                    {busy ? 'Withdrawing…' : 'Confirm withdrawal'}
                  </button>
                  <button className="button secondary small" onClick={() => setConfirm(undefined)}>
                    Keep listing
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <Pagination meta={r.meta} page={page} setPage={setPage} />
    </div>
  );
}
export function Claims() {
  const [page, setPage] = useState(1);
  const r = useApi<Claim[]>(`/claims/mine?page=${page}`);
  return (
    <div className="cf-dashboard-shell cf-dashboard-claims">
      <PageIntro
        eyebrow="ONE STEP CLOSER TO HOME"
        title="My claims."
        description="Follow your ownership claims from verification to happy reunion."
      />
      <div className="notice">
        <ShieldCheck size={22} />
        <div>
          <strong>Your ownership evidence stays private.</strong>
          <p>
            Approval verifies ownership. Your item is marked returned after actual handover at the
            campus desk.
          </p>
        </div>
      </div>
      {r.loading ? (
        <Loading />
      ) : r.error ? (
        <ErrorState message={r.error} />
      ) : !r.data?.length ? (
        <Empty
          title="No claims just yet"
          text="Recognise a found item? Submit a private claim and the campus team will take a look."
          action={
            <Link to="/browse?type=FOUND" className="button primary small">
              Browse found items
              <ArrowRight size={15} />
            </Link>
          }
        />
      ) : (
        <div className="claims-list">
          {r.data.map((c) => (
            <article className="panel claim-card" key={c.id}>
              <div className="panel-title">
                <div>
                  <span className="eyebrow">CLAIM #{c.id}</span>
                  <Link to={`/items/${c.itemId}`}>
                    <h3>{c.item.title}</h3>
                  </Link>
                </div>
                <Badge value={c.status} />
              </div>
              <p className="subtle">
                Submitted {date(c.createdAt)} · {c.item.location}
              </p>
              <div className="claim-evidence">
                <h4>Your ownership explanation</h4>
                <p>{c.ownershipProof}</p>
                <h4>Private identifying details</h4>
                <p>{c.identifyingDetails}</p>
                {c.supportingInformation && (
                  <>
                    <h4>Supporting information</h4>
                    <p>{c.supportingInformation}</p>
                  </>
                )}
              </div>
              {c.reviewNote && (
                <div className="review-note">
                  <strong>Review note</strong>
                  <p>{c.reviewNote}</p>
                </div>
              )}
              {c.status === 'APPROVED' && (
                <div className="notice">
                  <CheckCircle2 size={20} />
                  <p>
                    {c.item.status === 'RETURNED'
                      ? 'Handover confirmed. Your item is back where it belongs.'
                      : 'Ownership verified! Visit the campus desk to arrange physical handover.'}
                  </p>
                </div>
              )}
              <Link className="text-link" to={`/items/${c.itemId}`}>
                View listing
                <ArrowRight size={15} />
              </Link>
            </article>
          ))}
        </div>
      )}
      <Pagination meta={r.meta} page={page} setPage={setPage} />
    </div>
  );
}
export function Notifications() {
  const [rev, setRev] = useState(0);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<number>();
  const toast = useToast();
  const r = useApi<Notification[]>(`/notifications?page=${page}`, rev);
  async function mark(id: number) {
    setBusy(id);
    try {
      await api(`/notifications/${id}/read`, { method: 'PATCH' });
      setRev((v) => v + 1);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(undefined);
    }
  }
  return (
    <div className="cf-dashboard-shell cf-dashboard-notifications">
      <PageIntro
        eyebrow="GOOD NEWS FINDS ITS WAY"
        title="Your notifications."
        description="Updates on your listings, claims, and happy reunions."
      />
      <div className="section-toolbar">
        <span className="subtle">{r.meta?.unread ?? 0} unread updates</span>
        <Bell size={19} />
      </div>
      {r.loading ? (
        <Loading />
      ) : r.error ? (
        <ErrorState message={r.error} />
      ) : !r.data?.length ? (
        <Empty
          title="All quiet for now"
          text="We’ll keep you posted when there’s news about your items or claims."
        />
      ) : (
        <div className="notification-list">
          {r.data.map((n) => (
            <article className={`panel notification ${n.isRead ? '' : 'unread'}`} key={n.id}>
              <span className="notification-icon">
                <Bell size={20} />
              </span>
              <div>
                <p>{n.message}</p>
                <span>{date(n.createdAt)}</span>
              </div>
              {!n.isRead && (
                <button
                  className="button secondary small"
                  disabled={busy === n.id}
                  onClick={() => mark(n.id)}
                >
                  Mark read
                </button>
              )}
            </article>
          ))}
        </div>
      )}
      <Pagination meta={r.meta} page={page} setPage={setPage} />
    </div>
  );
}
