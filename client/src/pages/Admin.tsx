import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  LayoutGrid,
  Package,
  Plus,
  Radio,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  api,
  date,
  friendly,
  json,
  type Category,
  type Claim,
  type Dashboard,
  type Item,
  type User,
} from '../api';
import { useApi, useToast } from '../hooks';
import { Badge, Empty, ErrorState, Loading, PageIntro, Pagination } from '../components';
import { DashboardNumber } from './Workspace';
import './WorkspaceCreative.css';

const adminTabs = [
  {
    id: 'claims',
    label: 'Claim verification',
    icon: ShieldCheck,
    description: 'A careful check. A happy reunion.',
  },
  {
    id: 'items',
    label: 'Item moderation',
    icon: Package,
    description: 'Keep the noticeboard useful, and confirm each physical handover.',
  },
  {
    id: 'categories',
    label: 'Categories',
    icon: LayoutGrid,
    description: 'A little organisation helps good things get found.',
  },
  {
    id: 'users',
    label: 'Members',
    icon: Users,
    description: 'Look after the people who make this community work.',
  },
];

export function Admin() {
  const [tab, setTab] = useState('claims');
  const [revision, setRevision] = useState(0);
  const reducedMotion = useReducedMotion();
  const r = useApi<Dashboard>('/admin/dashboard', revision);
  const reportTotal = r.data ? r.data.lost + r.data.found : 0;
  const reunionPercent =
    reportTotal > 0 && r.data ? Math.round((r.data.returned / reportTotal) * 100) : 0;
  function moveTab(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % adminTabs.length;
    else if (event.key === 'ArrowLeft') next = (index + adminTabs.length - 1) % adminTabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = adminTabs.length - 1;
    else return;
    event.preventDefault();
    setTab(adminTabs[next].id);
    document.getElementById(`cf-admin-tab-${adminTabs[next].id}`)?.focus();
  }
  return (
    <div className="cf-admin-shell">
      <PageIntro
        eyebrow="CAMPUSFIND / CONTROL ROOM"
        title="Good things. In good hands."
        description="You’re the human behind the happy endings. Let’s make a few more."
      />
      {r.loading ? (
        <Loading />
      ) : r.error ? (
        <ErrorState message={r.error} />
      ) : (
        r.data && (
          <>
            <motion.section
              className="cf-admin-overview"
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              aria-label="Campus overview"
            >
              <div className="cf-admin-reunion">
                <span className="cf-dashboard-kicker">
                  <Radio size={14} /> CAMPUS PULSE
                </span>
                <div className="cf-admin-reunion-value">
                  <strong>
                    <DashboardNumber value={r.data.returned} />
                  </strong>
                  <CheckCircle2 size={37} />
                </div>
                <h2>things found their way home.</h2>
                <p>A real handover. A relieved owner. That’s the part that counts.</p>
                <div className="cf-admin-outcome-label">
                  <span>Returned / all reported items</span>
                  <strong>{reunionPercent}%</strong>
                </div>
                <div
                  className="cf-admin-outcome-track"
                  role="progressbar"
                  aria-label="Share of reported items returned"
                  aria-valuenow={reunionPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <motion.span
                    initial={reducedMotion ? false : { width: 0 }}
                    animate={{ width: `${reunionPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
              <div className="cf-admin-queue">
                <span className="cf-dashboard-kicker">NEXT UP / OWNERSHIP REVIEW</span>
                <div className="cf-admin-queue-value">
                  <strong>
                    <DashboardNumber value={r.data.pending} />
                  </strong>
                  <Clock3 size={28} />
                </div>
                <h2>{r.data.pending === 1 ? 'claim needs your eye.' : 'claims need your eye.'}</h2>
                <p>Compare private details, verify ownership, then arrange the handover.</p>
                <button
                  className="cf-admin-review-link"
                  onClick={() => {
                    setTab('claims');
                    document.getElementById('cf-admin-tab-claims')?.focus();
                  }}
                >
                  Open claim review <ArrowUpRight size={18} />
                </button>
              </div>
            </motion.section>
            <div className="dashboard-stats cf-dashboard-stats cf-admin-stats">
              {[
                {
                  label: 'Campus members',
                  value: r.data.users ?? 0,
                  icon: Users,
                  tone: 'violet',
                  detail: 'Registered accounts',
                },
                {
                  label: 'Lost reports',
                  value: r.data.lost,
                  icon: Search,
                  tone: 'coral',
                  detail: 'Across all statuses',
                },
                {
                  label: 'Found reports',
                  value: r.data.found,
                  icon: Package,
                  tone: 'blue',
                  detail: 'Across all statuses',
                },
              ].map(({ label, value, icon: Icon, tone, detail }, index) => (
                <motion.div
                  className={`cf-dashboard-stat cf-dashboard-tone-${tone}`}
                  key={label}
                  initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.06 }}
                >
                  <div>
                    <span>{label}</span>
                    <Icon size={19} />
                  </div>
                  <strong>
                    <DashboardNumber value={value} />
                  </strong>
                  <small>{detail}</small>
                </motion.div>
              ))}
            </div>
            <section
              className="cf-admin-mix"
              aria-label={`Campus report composition: ${r.data.lost} lost reports and ${r.data.found} found reports across all statuses`}
            >
              <span>THE NOTICEBOARD MIX</span>
              <div className="cf-admin-mix-track" aria-hidden="true">
                <span
                  style={{ width: `${reportTotal ? (r.data.lost / reportTotal) * 100 : 0}%` }}
                />
                <span
                  style={{ width: `${reportTotal ? (r.data.found / reportTotal) * 100 : 0}%` }}
                />
              </div>
              <span>
                <i /> Lost <strong>{r.data.lost}</strong>
              </span>
              <span>
                <i /> Found <strong>{r.data.found}</strong>
              </span>
            </section>
          </>
        )
      )}
      <div className="admin-tabs cf-admin-tabs" role="tablist" aria-label="Administration">
        {adminTabs.map(({ id, label, icon: Icon }, index) => (
          <button
            key={id}
            id={`cf-admin-tab-${id}`}
            role="tab"
            aria-selected={tab === id}
            aria-controls={`cf-admin-panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
            onKeyDown={(event) => moveTab(event, index)}
          >
            <Icon size={16} />
            {label}
            {id === 'claims' && r.data && (
              <span className="cf-admin-tab-count">{r.data.pending}</span>
            )}
          </button>
        ))}
      </div>
      {adminTabs.map(({ id, description }) => (
        <section
          key={id}
          id={`cf-admin-panel-${id}`}
          role="tabpanel"
          aria-labelledby={`cf-admin-tab-${id}`}
          tabIndex={tab === id ? 0 : -1}
          hidden={tab !== id}
          className="cf-admin-panel"
        >
          {tab === id && (
            <>
              <div className="cf-admin-panel-heading">
                <span className="cf-dashboard-kicker">{description}</span>
                <span>
                  <ShieldCheck size={13} /> ADMIN ACCESS
                </span>
              </div>
              {id === 'claims' ? (
                <AdminClaims onChange={() => setRevision((v) => v + 1)} />
              ) : id === 'items' ? (
                <AdminItems onChange={() => setRevision((v) => v + 1)} />
              ) : id === 'categories' ? (
                <AdminCategories />
              ) : (
                <AdminUsers />
              )}
            </>
          )}
        </section>
      ))}
      {r.data && (
        <section className="cf-admin-audit" aria-labelledby="cf-admin-audit-title">
          <div className="cf-admin-audit-heading">
            <div>
              <span className="cf-dashboard-kicker">BEHIND EVERY GOOD ENDING</span>
              <h2 id="cf-admin-audit-title">The campus activity log.</h2>
            </div>
            <Radio size={19} />
          </div>
          {r.data.activity.length ? (
            <ol>
              {r.data.activity.slice(0, 5).map((activity) => (
                <li key={activity.id}>
                  <span className="cf-admin-audit-dot" />
                  <div>
                    <strong>{friendly(activity.action)}</strong>
                    <span>
                      {activity.actor?.fullName ?? 'Campus system'} ·{' '}
                      {friendly(activity.entityType)} #{activity.entityId}
                    </span>
                  </div>
                  <time dateTime={activity.createdAt}>{date(activity.createdAt)}</time>
                </li>
              ))}
            </ol>
          ) : (
            <p>Community activity will appear here as reports and claims come in.</p>
          )}
        </section>
      )}
    </div>
  );
}
function AdminClaims({ onChange }: { onChange: () => void }) {
  const [status, setStatus] = useState('PENDING');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [rev, setRev] = useState(0);
  const [busy, setBusy] = useState<number>();
  const [note, setNote] = useState<Record<number, string>>({});
  const toast = useToast();
  const r = useApi<Claim[]>(
    `/admin/claims?page=${page}&status=${status}&q=${encodeURIComponent(q)}`,
    rev,
  );
  async function review(id: number, decision: 'APPROVED' | 'REJECTED') {
    setBusy(id);
    try {
      await api(`/admin/claims/${id}`, {
        method: 'PATCH',
        body: json({ status: decision, reviewNote: note[id] ?? '' }),
      });
      toast(
        decision === 'APPROVED'
          ? 'Ownership verified. Confirm physical handover separately in Item moderation.'
          : 'Claim rejected. The claimant has been notified.',
      );
      setRev((v) => v + 1);
      onChange();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(undefined);
    }
  }
  return (
    <>
      <div className="admin-filters">
        <input
          aria-label="Search claims by item"
          placeholder="Search by item title"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="Filter claim status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="PENDING">Pending verification</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>
      {r.loading ? (
        <Loading />
      ) : r.error ? (
        <ErrorState message={r.error} />
      ) : !r.data?.length ? (
        <Empty
          title="No claims in this view"
          text="New ownership claims will appear here for careful review."
        />
      ) : (
        <div className="claims-list">
          {r.data.map((c) => (
            <section className="panel claim-card" key={c.id}>
              <div className="panel-title">
                <div>
                  <span className="eyebrow">
                    CLAIM #{c.id} · {date(c.createdAt)}
                  </span>
                  <h3>
                    <Link to={`/items/${c.itemId}`}>{c.item.title}</Link>
                  </h3>
                  <p className="subtle">Submitted by {c.claimant?.fullName}</p>
                </div>
                <Badge value={c.status} />
              </div>
              <div className="evidence-comparison">
                <div>
                  <span className="eyebrow">CLAIMANT EVIDENCE</span>
                  <h4>Ownership explanation</h4>
                  <p>{c.ownershipProof}</p>
                  <h4>Identifying details</h4>
                  <p>{c.identifyingDetails}</p>
                  {c.supportingInformation && (
                    <>
                      <h4>Supporting information</h4>
                      <p>{c.supportingInformation}</p>
                    </>
                  )}
                </div>
                <div>
                  <span className="eyebrow">REPORTER’S PRIVATE DETAILS</span>
                  <p>
                    {c.item.identifyingDetails ||
                      'No private identifiers were provided. Verify ownership in person before approval.'}
                  </p>
                  <div className="notice">
                    <ShieldCheck size={20} />
                    <p>
                      Never approve based only on the public description. Compare unique details and
                      evidence.
                    </p>
                  </div>
                </div>
              </div>
              {c.status === 'PENDING' ? (
                <>
                  <label className="review-field">
                    Review note <span className="optional">visible to claimant · optional</span>
                    <textarea
                      rows={2}
                      maxLength={500}
                      value={note[c.id] ?? ''}
                      onChange={(e) => setNote((v) => ({ ...v, [c.id]: e.target.value }))}
                    />
                  </label>
                  <div className="item-manage-actions">
                    <button
                      className="button primary small"
                      disabled={busy === c.id}
                      onClick={() => review(c.id, 'APPROVED')}
                    >
                      <CheckCircle2 size={16} />
                      Verify ownership
                    </button>
                    <button
                      className="button secondary small danger-text"
                      disabled={busy === c.id}
                      onClick={() => review(c.id, 'REJECTED')}
                    >
                      Reject claim
                    </button>
                  </div>
                </>
              ) : (
                c.reviewNote && <p className="review-note">{c.reviewNote}</p>
              )}
            </section>
          ))}
        </div>
      )}
      <Pagination meta={r.meta} page={page} setPage={setPage} />
    </>
  );
}
function AdminItems({ onChange }: { onChange: () => void }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [rev, setRev] = useState(0);
  const [confirm, setConfirm] = useState<{ id: number; action: 'return' | 'withdraw' }>();
  const [handover, setHandover] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const r = useApi<Item[]>(
    `/items?page=${page}&q=${encodeURIComponent(q)}${status ? `&status=${status}` : ''}`,
    rev,
  );
  async function act() {
    if (!confirm) return;
    setBusy(true);
    try {
      await api(`/admin/items/${confirm.id}${confirm.action === 'return' ? '/return' : ''}`, {
        method: confirm.action === 'return' ? 'POST' : 'DELETE',
        ...(confirm.action === 'return' ? { body: json({ handoverConfirmed: true }) } : {}),
      });
      toast(
        confirm.action === 'return'
          ? 'Physical handover confirmed. Another happy reunion!'
          : 'Listing withdrawn and pending claims closed.',
      );
      setConfirm(undefined);
      setRev((v) => v + 1);
      onChange();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="admin-filters">
        <input
          aria-label="Search moderation listings"
          placeholder="Search item title"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="Moderation status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Public listings</option>
          <option value="OPEN">Open</option>
          <option value="VERIFIED">Awaiting handover</option>
          <option value="RETURNED">Returned</option>
          <option value="WITHDRAWN">Withdrawn</option>
        </select>
      </div>
      {r.loading ? (
        <Loading />
      ) : r.error ? (
        <ErrorState message={r.error} />
      ) : !r.data?.length ? (
        <Empty />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {r.data.map((i) => (
                <tr key={i.id}>
                  <td>
                    <Link className="table-title" to={`/items/${i.id}`}>
                      {i.title}
                    </Link>
                    <small>
                      {i.type} · #{i.id}
                    </small>
                  </td>
                  <td>{i.location}</td>
                  <td>
                    <Badge value={i.status} />
                  </td>
                  <td>
                    <div className="table-actions">
                      {(i.status === 'VERIFIED' || (i.status === 'OPEN' && i.type === 'LOST')) && (
                        <button
                          className="button secondary small"
                          onClick={() => {
                            setConfirm({ id: i.id, action: 'return' });
                            setHandover(false);
                          }}
                        >
                          Confirm handover
                        </button>
                      )}
                      {i.status === 'OPEN' && (
                        <button
                          className="reset-button danger-text"
                          onClick={() => setConfirm({ id: i.id, action: 'withdraw' })}
                        >
                          Withdraw
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {confirm && (
        <div className="panel inline-confirm" role="region" aria-label="Confirm moderation action">
          <h3>
            {confirm.action === 'return'
              ? 'Confirm an actual happy reunion'
              : 'Withdraw this listing?'}
          </h3>
          <p>
            Listing #{confirm.id}.{' '}
            {confirm.action === 'return'
              ? 'Only continue after the item has physically reached its verified owner.'
              : 'This removes the listing from public discovery and rejects pending claims. History is preserved.'}
          </p>
          {confirm.action === 'return' && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={handover}
                onChange={(e) => setHandover(e.target.checked)}
              />
              I confirm that physical handover has taken place.
            </label>
          )}
          <button
            className="button primary small"
            disabled={busy || (confirm.action === 'return' && !handover)}
            onClick={act}
          >
            Confirm {confirm.action === 'return' ? 'handover' : 'withdrawal'}
          </button>
          <button className="button secondary small" onClick={() => setConfirm(undefined)}>
            Cancel
          </button>
        </div>
      )}
      <Pagination meta={r.meta} page={page} setPage={setPage} />
    </>
  );
}
function AdminCategories() {
  const [rev, setRev] = useState(0);
  const r = useApi<Category[]>('/categories', rev);
  const [editing, setEditing] = useState<Category>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [remove, setRemove] = useState<number>();
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(editing ? `/admin/categories/${editing.id}` : '/admin/categories', {
        method: editing ? 'PATCH' : 'POST',
        body: json({ name, description }),
      });
      toast(editing ? 'Category updated.' : 'Category created.');
      setEditing(undefined);
      setName('');
      setDescription('');
      setRev((v) => v + 1);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  async function del(id: number) {
    setBusy(true);
    try {
      await api(`/admin/categories/${id}`, { method: 'DELETE' });
      toast('Category deleted.');
      setRemove(undefined);
      setRev((v) => v + 1);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <form className="panel form-stack category-form" onSubmit={save}>
        <h3>{editing ? 'Edit category' : 'Add a category'}</h3>
        <div className="form-row">
          <label>
            Category name
            <input
              minLength={2}
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label>
            Description
            <input
              maxLength={255}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </div>
        <div className="item-manage-actions">
          <button className="button primary small" disabled={busy}>
            <Plus size={16} />
            {editing ? 'Save category' : 'Add category'}
          </button>
          {editing && (
            <button
              type="button"
              className="button secondary small"
              onClick={() => {
                setEditing(undefined);
                setName('');
                setDescription('');
              }}
            >
              Cancel editing
            </button>
          )}
        </div>
      </form>
      {r.loading ? (
        <Loading />
      ) : r.error ? (
        <ErrorState message={r.error} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {r.data?.map((c) => (
                <tr key={c.id}>
                  <td className="table-title">{c.name}</td>
                  <td>{c.description}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="reset-button"
                        onClick={() => {
                          setEditing(c);
                          setName(c.name);
                          setDescription(c.description);
                        }}
                      >
                        Edit
                      </button>
                      <button className="reset-button danger-text" onClick={() => setRemove(c.id)}>
                        Delete
                      </button>
                    </div>
                    {remove === c.id && (
                      <div className="inline-confirm">
                        <p>Delete “{c.name}”? Categories used by any listing cannot be deleted.</p>
                        <button
                          className="button danger small"
                          disabled={busy}
                          onClick={() => del(c.id)}
                        >
                          Confirm
                        </button>
                        <button
                          className="button secondary small"
                          onClick={() => setRemove(undefined)}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
function AdminUsers() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [rev, setRev] = useState(0);
  const [busy, setBusy] = useState<number>();
  const toast = useToast();
  const r = useApi<User[]>(`/admin/users?page=${page}&q=${encodeURIComponent(q)}`, rev);
  async function toggle(u: User) {
    setBusy(u.id);
    try {
      await api(`/admin/users/${u.id}`, { method: 'PATCH', body: json({ isActive: !u.isActive }) });
      toast(u.isActive ? 'Account deactivated and sessions revoked.' : 'Account reactivated.');
      setRev((v) => v + 1);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(undefined);
    }
  }
  return (
    <>
      <div className="admin-filters">
        <input
          aria-label="Search members"
          placeholder="Search name or email"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
      </div>
      {r.loading ? (
        <Loading />
      ) : r.error ? (
        <ErrorState message={r.error} />
      ) : !r.data?.length ? (
        <Empty title="No matching members" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {r.data.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.fullName}</strong>
                    <small>{u.email}</small>
                  </td>
                  <td>{u.role}</td>
                  <td>
                    <span className={`badge ${u.isActive ? 'badge-found' : 'badge-withdrawn'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {u.role !== 'ADMIN' && (
                      <button
                        className="button secondary small"
                        disabled={busy === u.id}
                        onClick={() => toggle(u)}
                      >
                        {u.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination meta={r.meta} page={page} setPage={setPage} />
    </>
  );
}
