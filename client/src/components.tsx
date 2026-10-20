import {
  ArrowDownLeft,
  ArrowUpRight,
  Backpack,
  Bell,
  BookOpen,
  Calculator,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Compass,
  CreditCard,
  Headphones,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Shirt,
  Sparkles,
  Watch,
  X,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CountUp, useCardTilt } from './creative/Motion';
import { api, date, friendly, type Item, type Meta } from './api';
import { useAuth, useToast } from './hooks';

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="CampusFind home">
      <span className="logo-mark">
        <Compass size={25} strokeWidth={2.1} />
      </span>
      <span>
        campus<span className="text-blue">find</span>
        <sup className="cf-version">2.0</sup>
        <small>LOST & FOUND, REIMAGINED.</small>
      </span>
    </Link>
  );
}
export function Shell() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  const reduced = useReducedMotion();
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
      setUser(null);
      setMenu(false);
      navigate('/');
      toast('You’re signed out. See you around campus!');
    } catch (e) {
      toast((e as Error).message, true);
    }
  }
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Logo />
          <nav className={menu ? 'top-nav mobile-open' : 'top-nav'} aria-label="Main navigation">
            <NavLink to="/" end onClick={() => setMenu(false)}>
              Home
            </NavLink>
            <NavLink to="/browse" onClick={() => setMenu(false)}>
              Browse items
            </NavLink>
            <Link to="/#how-it-works" onClick={() => setMenu(false)}>
              How it works
            </Link>
            {user && (
              <NavLink to="/dashboard" onClick={() => setMenu(false)}>
                My dashboard
              </NavLink>
            )}
            {user && (
              <button className="mobile-signout" onClick={logout}>
                <LogOut size={17} /> Sign out
              </button>
            )}
          </nav>
          <div className="header-actions">
            {user ? (
              <>
                <Link className="icon-button" to="/notifications" aria-label="Notifications">
                  <Bell size={20} />
                </Link>
                <Link to="/dashboard" className="avatar" aria-label="My dashboard">
                  {user.fullName
                    .replace('[Demo] ', '')
                    .split(' ')
                    .map((v) => v[0])
                    .slice(0, 2)
                    .join('')}
                </Link>
                <button className="icon-button logout" onClick={logout} aria-label="Sign out">
                  <LogOut size={19} />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="login-link">
                  Log in
                </Link>
                <Link to="/register" className="button primary small">
                  Join the good ones
                  <ArrowUpRight size={16} />
                </Link>
              </>
            )}
            <button
              className="icon-button mobile-menu"
              onClick={() => setMenu((v) => !v)}
              aria-label={menu ? 'Close navigation' : 'Open navigation'}
              aria-expanded={menu}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <motion.div
        className="cf-route-stage"
        key={location.pathname}
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <Outlet />
      </motion.div>
      <footer className="footer">
        <div className="container footer-top">
          <Logo />
          <p>
            YOUR THINGS HAVE STORIES.
            <br />
            Let’s give them a comeback.
          </p>
          <div>
            <Link to="/browse">Find an item</Link>
            <Link to="/report/lost">Report an item</Link>
            <a href="/#how-it-works">How it works</a>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} CAMPUSFIND / MADE OF SMALL ACTS OF KINDNESS.</span>
          <span>
            <ShieldCheck size={14} /> Privacy first. Community always.
          </span>
        </div>
      </footer>
    </>
  );
}
export function Workspace() {
  const { user } = useAuth();
  return (
    <div className="workspace container">
      <aside className="sidebar">
        <span className="eyebrow">YOUR CAMPUS SPACE</span>
        <NavLink to="/dashboard">
          <LayoutDashboard size={19} />
          Overview
        </NavLink>
        <NavLink to="/my-items">
          <Package size={19} />
          My listings
        </NavLink>
        <NavLink to="/claims">
          <ShieldCheck size={19} />
          My claims
        </NavLink>
        <NavLink to="/notifications">
          <Bell size={19} />
          Notifications
        </NavLink>
        {user?.role === 'ADMIN' && (
          <NavLink to="/admin">
            <ShieldCheck size={19} />
            Admin workspace
          </NavLink>
        )}
        <div className="sidebar-card">
          <Sparkles size={22} />
          <h4>Found something?</h4>
          <p>A small gesture can make someone’s day.</p>
          <Link to="/report/found" className="button white small">
            <Plus size={16} />
            Report found item
          </Link>
        </div>
        <Link to="/browse" className="sidebar-help">
          <CircleHelp size={17} />
          Explore the community
        </Link>
      </aside>
      <div className="workspace-main">
        <Outlet />
      </div>
    </div>
  );
}
export function PageIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-intro">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <div className="cf-loading-orbit">
        <span />
        <span />
        <span />
      </div>
      Finding the good stuff…
    </div>
  );
}
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="error-state" role="alert">
      <CircleHelp size={28} />
      <h3>We couldn’t load this just yet</h3>
      <p>{message}</p>
      {retry && (
        <button className="button secondary small" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function Empty({
  title = 'Nothing here just yet',
  text = 'Try a different search or check back soon.',
  action,
}: {
  title?: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Search size={29} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function Badge({ value }: { value: string }) {
  return (
    <span className={`badge badge-${value.toLowerCase()}`}>
      {value === 'LOST' ? (
        <ArrowUpRight size={12} />
      ) : value === 'FOUND' ? (
        <ArrowDownLeft size={12} />
      ) : ['RETURNED', 'APPROVED'].includes(value) ? (
        <Check size={12} />
      ) : (
        <span className="badge-dot" />
      )}
      {value === 'OPEN' ? 'Open listing' : friendly(value)}
    </span>
  );
}
export function CategoryIcon({ name, size = 28 }: { name: string; size?: number }) {
  const Icon = /electronic/i.test(name)
    ? Headphones
    : /card|id /i.test(name)
      ? CreditCard
      : /book|note/i.test(name)
        ? BookOpen
        : /bag/i.test(name)
          ? Backpack
          : /key/i.test(name)
            ? KeyRound
            : /cloth/i.test(name)
              ? Shirt
              : /accessor/i.test(name)
                ? Watch
                : Package;
  return <Icon size={size} strokeWidth={1.5} />;
}
export function ItemArt({ item, large = false }: { item: Item; large?: boolean }) {
  const Icon = /calculator/i.test(item.title) ? Calculator : undefined;
  return (
    <div className={`item-art art-${item.categoryId % 6} ${large ? 'art-large' : ''}`}>
      {item.imagePath ? (
        <img src={item.imagePath} alt={item.title} loading="lazy" />
      ) : (
        <>
          <span className="art-orbit" />
          <span className="art-object">
            {Icon ? (
              <Icon size={large ? 110 : 70} strokeWidth={1.1} />
            ) : (
              <CategoryIcon name={item.category.name} size={large ? 120 : 76} />
            )}
          </span>
          <span className="art-caption">{item.category.name}</span>
        </>
      )}
    </div>
  );
}
export function ItemCard({ item, list = false }: { item: Item; list?: boolean }) {
  const tilt = useCardTilt();
  const reduced = useReducedMotion();
  return (
    <motion.article
      layout
      {...tilt}
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`item-card ${list ? 'item-card-list' : ''}`}
    >
      <Link to={`/items/${item.id}`} className="item-card-link">
        <div className="item-visual">
          <ItemArt item={item} />
          <span className="visual-badge">
            <Badge value={item.type} />
          </span>
          <span className="visual-arrow">
            <ArrowUpRight size={18} />
          </span>
        </div>
        <div className="item-card-body">
          <div className="card-kicker">
            <span>{item.category.name}</span>
            <span>{date(item.eventDate)}</span>
          </div>
          <h3>{item.title}</h3>
          <p className="item-location">
            <MapPin size={14} />
            {item.location}
          </p>
          <div className="card-bottom">
            <Badge value={item.status} />
            <span>
              Take a closer look <ArrowUpRight size={15} />
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
export function Pagination({
  meta,
  page,
  setPage,
}: {
  meta?: Meta;
  page: number;
  setPage: (n: number) => void;
}) {
  if (!meta || meta.pages < 2) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <span>
        {meta.total} results · Page {page} of {meta.pages}
      </span>
      <div>
        <button
          className="icon-button"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          className="icon-button"
          disabled={page >= meta.pages}
          onClick={() => setPage(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </nav>
  );
}
export function StatCard({
  label,
  value,
  icon,
  color = 'blue',
  detail,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  color?: string;
  detail?: string;
}) {
  return (
    <div className="stat-card">
      <span className={`stat-icon ${color}`}>{icon}</span>
      <div className="stat-value">
        <CountUp value={value} />
      </div>
      <span className="stat-label">{label}</span>
      {detail && <small>{detail}</small>}
    </div>
  );
}
export function FieldError({ message }: { message?: string }) {
  return message ? (
    <span className="field-error" role="alert">
      {message}
    </span>
  ) : null;
}
export function SuccessPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="notice">
      <CheckCircle2 size={22} />
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}
