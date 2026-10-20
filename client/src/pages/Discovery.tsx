import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Grid2X2, List, Search, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { useApi } from '../hooks';
import { type Category, type Item } from '../api';
import { Empty, ErrorState, ItemCard, Loading, Pagination } from '../components';
export { Home } from './Home';

export function Browse() {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState(params.get('q') ?? '');
  const categories = useApi<Category[]>('/categories');
  const query = params.toString();
  const items = useApi<Item[]>(`/items?${query}`);
  const page = Number(params.get('page') ?? 1);
  useEffect(() => setSearch(params.get('q') ?? ''), [params]);
  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  }
  return (
    <main className="container browse-page">
      <div className="cf-gallery-intro">
        <div>
          <span className="eyebrow">
            <span className="cf-pulse-dot" />
            THE LIVING CAMPUS NOTICEBOARD
          </span>
          <h1>
            THE LOST.
            <br />
            THE FOUND.
            <br />
            <em>THE ALMOST HOME.</em>
          </h1>
          <p>Recognise something? That next happy reunion could be yours.</p>
        </div>
        <div className="cf-gallery-sticker">
          <ArrowUpRight size={35} />
          <span>
            GOOD THINGS
            <br />
            ARE OUT THERE.
          </span>
        </div>
      </div>
      <div className="browse-search">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            set('q', search);
          }}
        >
          <Search size={20} />
          <input
            aria-label="Search listings"
            placeholder="Search for earbuds, keys, a little peace of mind…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="button primary small">Search items</button>
        </form>
      </div>
      <div className="filter-panel">
        <span className="cf-filter-title">
          <SlidersHorizontal size={16} /> REFINE YOUR FIND
        </span>
        <div className="segmented">
          <button className={!params.get('type') ? 'active' : ''} onClick={() => set('type', '')}>
            All items
          </button>
          <button
            className={params.get('type') === 'LOST' ? 'active' : ''}
            onClick={() => set('type', 'LOST')}
          >
            Lost
          </button>
          <button
            className={params.get('type') === 'FOUND' ? 'active' : ''}
            onClick={() => set('type', 'FOUND')}
          >
            Found
          </button>
        </div>
        <label>
          <span className="sr-only">Category</span>
          <select
            value={params.get('categoryId') ?? ''}
            onChange={(e) => set('categoryId', e.target.value)}
          >
            <option value="">All categories</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Location</span>
          <input
            className="location-filter"
            placeholder="Filter by location"
            value={params.get('location') ?? ''}
            onChange={(e) => set('location', e.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Status</span>
          <select
            value={params.get('status') ?? ''}
            onChange={(e) => set('status', e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="VERIFIED">Verified</option>
            <option value="RETURNED">Returned</option>
          </select>
        </label>
        <button
          className="reset-button"
          onClick={() => {
            setParams({});
            setSearch('');
          }}
        >
          Reset filters
        </button>
      </div>
      <div className="results-toolbar">
        <span>
          <strong>{items.meta?.total ?? '—'}</strong> items on the noticeboard
        </span>
        <div>
          <label>
            <span className="sr-only">Sort listings</span>
            <select
              value={params.get('sort') ?? 'newest'}
              onChange={(e) => set('sort', e.target.value)}
            >
              <option value="newest">Recently reported</option>
              <option value="oldest">Oldest first</option>
              <option value="event">Event date</option>
            </select>
          </label>
          <div className="view-toggle">
            <button
              className={view === 'grid' ? 'active' : ''}
              onClick={() => setView('grid')}
              aria-label="Grid view"
              aria-pressed={view === 'grid'}
            >
              <Grid2X2 size={18} />
            </button>
            <button
              className={view === 'list' ? 'active' : ''}
              onClick={() => setView('list')}
              aria-label="List view"
              aria-pressed={view === 'list'}
            >
              <List size={19} />
            </button>
          </div>
        </div>
      </div>
      {items.loading ? (
        <Loading />
      ) : items.error ? (
        <ErrorState message={items.error} />
      ) : items.data?.length ? (
        <div className={view === 'list' ? 'items-list' : 'items-grid cf-gallery-grid'}>
          {items.data.map((item) => (
            <ItemCard key={item.id} item={item} list={view === 'list'} />
          ))}
        </div>
      ) : (
        <Empty
          title="No matches just yet"
          text="Try a broader search, change your filters, or report the item you’re looking for."
          action={
            <Link to="/report/lost" className="button secondary small">
              Report a lost item
            </Link>
          }
        />
      )}
      <Pagination meta={items.meta} page={page} setPage={(n) => set('page', String(n))} />
      <div className="browse-bottom">
        <ShieldCheck size={19} />
        <p>Ownership details stay private. Every claim is verified by a campus administrator.</p>
      </div>
    </main>
  );
}
