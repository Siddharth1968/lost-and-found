import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Asterisk,
  CheckCircle2,
  Heart,
  MoveUpRight,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useApi } from '../hooks';
import type { Category, Item } from '../api';
import { CategoryIcon, Empty, ErrorState, ItemCard, Loading } from '../components';
import { CountUp, HeroScene, MagneticLink, useEditorialMotion } from '../creative/Motion';

export function Home() {
  const root = useRef<HTMLElement>(null);
  useEditorialMotion(root);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const navigate = useNavigate();
  const stats = useApi<{ lost: number; found: number; returned: number; total: number }>('/stats');
  const items = useApi<Item[]>(`/items?pageSize=6${type ? `&type=${type}` : ''}`);
  const categories = useApi<Category[]>('/categories');
  return (
    <main ref={root} className="cf-home">
      <section className="cf-hero container" aria-labelledby="cf-hero-title">
        <div className="cf-hero-top cf-hero-enter">
          <span>
            <span className="cf-pulse-dot" />
            THE CAMPUS REUNION CLUB
          </span>
          <span>
            SMALL ACTS. BIG COMEBACKS. <ArrowDownRight />
          </span>
        </div>
        <div className="cf-hero-layout">
          <div className="cf-hero-copy">
            <h1 id="cf-hero-title" aria-label="Good things find their way back.">
              <span className="cf-title-mask">
                <span className="cf-title-word">GOOD THINGS</span>
              </span>
              <span className="cf-title-mask">
                <span className="cf-title-word">FIND THEIR</span>
              </span>
              <span className="cf-title-mask cf-last-line">
                <span className="cf-title-word">
                  WAY <span className="cf-gradient-word">BACK.</span>
                  <span className="cf-title-asterisk" aria-hidden="true">
                    ✳
                  </span>
                </span>
              </span>
            </h1>
            <div className="cf-hero-lower cf-hero-enter">
              <p>
                For the headphones you can’t live without.
                <br />
                The notebook with your next big idea.
                <br />
                <strong>And the good people who bring them home.</strong>
              </p>
              <div className="cf-hero-actions">
                <MagneticLink to="/report/lost" className="button cf-button-dark">
                  I lost something
                  <span className="cf-button-icon">
                    <ArrowUpRight size={19} />
                  </span>
                </MagneticLink>
                <MagneticLink to="/report/found" className="button cf-button-lime">
                  I found something
                  <span className="cf-button-icon">
                    <ArrowDownLeft size={19} />
                  </span>
                </MagneticLink>
              </div>
              <form
                className="cf-hero-search"
                onSubmit={(e) => {
                  e.preventDefault();
                  navigate(`/browse?q=${encodeURIComponent(q)}`);
                }}
              >
                <Search size={18} />
                <input
                  aria-label="Search campus items"
                  placeholder="Looking for something? Start here."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <button aria-label="Search items" type="submit">
                  <ArrowRight size={21} />
                </button>
              </form>
            </div>
          </div>
          <HeroScene />
        </div>
        <div className="cf-hero-bottom cf-hero-enter">
          <span>
            <ShieldCheck size={15} />A little help. A whole lot of heart.
          </span>
          <a href="#noticeboard" className="cf-scroll-link">
            FIND YOUR NEXT REUNION{' '}
            <span>
              <ArrowDown size={14} />
            </span>
          </a>
          <span className="cf-edition">CAMPUSFIND / VOL. 02</span>
        </div>
      </section>
      <div className="cf-marquee" aria-hidden="true">
        <div>
          {[0, 1, 2, 3].map((i) => (
            <span key={i}>
              LOST LESS. <Asterisk /> CONNECT MORE. <Asterisk /> PASS IT FORWARD. <Asterisk />
            </span>
          ))}
        </div>
      </div>
      <section className="cf-impact container" data-reveal>
        <div className="cf-impact-intro">
          <span className="eyebrow">THE GOOD THINGS ADD UP</span>
          <p>
            Every object has a story.
            <br />
            <em>These are ours, so far.</em>
          </p>
        </div>
        <div className="cf-impact-stat">
          <strong>
            {stats.data ? <CountUp value={stats.data.total} /> : '—'}
            <span>↗</span>
          </strong>
          <span>belongings reported</span>
        </div>
        <div className="cf-impact-stat">
          <strong>
            {stats.data ? <CountUp value={stats.data.returned} /> : '—'}
            <Heart size={24} />
          </strong>
          <span>happy reunions</span>
        </div>
        <div className="cf-impact-stat">
          <strong>
            {stats.data ? <CountUp value={stats.data.found} /> : '—'}
            <Sparkles size={25} />
          </strong>
          <span>found & waiting</span>
        </div>
        {stats.error && (
          <p className="cf-live-error" role="status">
            Live counts are temporarily unavailable.
          </p>
        )}
      </section>
      <section className="cf-board section container" id="noticeboard">
        <div className="cf-section-heading" data-reveal>
          <div>
            <span className="eyebrow">
              <span className="cf-section-index">01 /</span>THE CAMPUS NOTICEBOARD
            </span>
            <h2>
              SOMEWHERE HERE,
              <br />
              <span>
                THERE’S A <em>“THAT’S MINE!”</em>
              </span>
            </h2>
          </div>
          <Link to="/browse" className="cf-circle-link" aria-label="Explore all items">
            <ArrowUpRight size={27} />
            <span>Explore all items</span>
          </Link>
        </div>
        <div className="section-toolbar">
          <div className="segmented">
            <button
              className={!type ? 'active' : ''}
              aria-pressed={!type}
              onClick={() => setType('')}
            >
              All the things
            </button>
            <button
              className={type === 'LOST' ? 'active' : ''}
              aria-pressed={type === 'LOST'}
              onClick={() => setType('LOST')}
            >
              <ArrowUpRight size={15} />
              Lost
            </button>
            <button
              className={type === 'FOUND' ? 'active' : ''}
              aria-pressed={type === 'FOUND'}
              onClick={() => setType('FOUND')}
            >
              <ArrowDownLeft size={15} />
              Found
            </button>
          </div>
          <span className="cf-live-label">
            <span className="cf-pulse-dot" />
            FRESH FROM CAMPUS
          </span>
        </div>
        {items.loading ? (
          <Loading />
        ) : items.error ? (
          <ErrorState message={items.error} />
        ) : !items.data?.length ? (
          <Empty
            title="A fresh noticeboard. A thousand possibilities."
            text="Be the first to post a lost or found item. Your campus story starts here."
            action={
              <Link to="/report/found" className="button primary">
                Post an item
                <ArrowUpRight size={17} />
              </Link>
            }
          />
        ) : (
          <div className="items-grid cf-home-grid">
            {items.data.map((item, index) => (
              <div className={`cf-card-slot slot-${index % 3}`} key={item.id}>
                <ItemCard item={item} />
              </div>
            ))}
          </div>
        )}
        <Link to="/browse" className="cf-board-more">
          There’s more to find.
          <span>
            See the whole noticeboard <ArrowRight size={18} />
          </span>
        </Link>
      </section>
      <section className="cf-how" id="how-it-works">
        <div className="container">
          <div className="cf-section-heading" data-reveal>
            <div>
              <span className="eyebrow">
                <span className="cf-section-index">02 /</span>GOOD THINGS HAPPEN TOGETHER
              </span>
              <h2>
                A LITTLE HELP.
                <br />
                <span>
                  A <em>HAPPY ENDING.</em>
                </span>
              </h2>
            </div>
            <p>
              No endless group chats.
              <br />
              No giving up on your favourite thing.
              <br />
              Just a better way back.
            </p>
          </div>
          <div className="cf-story-steps">
            {[
              {
                n: '01',
                word: 'PUT IT',
                accent: 'OUT THERE.',
                text: 'Lost your thing? Found someone else’s? Share a few details. A photo helps, too.',
                icon: <MoveUpRight />,
              },
              {
                n: '02',
                word: 'LET GOOD',
                accent: 'PEOPLE HELP.',
                text: 'Browse the noticeboard. Recognise something? Submit private details so our campus team can verify it.',
                icon: <Search />,
              },
              {
                n: '03',
                word: 'BACK WHERE',
                accent: 'IT BELONGS.',
                text: 'Once ownership is verified, arrange a handover at the campus desk. That’s one very good day.',
                icon: <CheckCircle2 />,
              },
            ].map((step) => (
              <article className="cf-story-step" data-reveal key={step.n}>
                <div className="cf-step-top">
                  <span>{step.n}</span>
                  {step.icon}
                </div>
                <h3>
                  {step.word}
                  <br />
                  <span>{step.accent}</span>
                </h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
          <div className="cf-privacy-line">
            <ShieldCheck size={19} />
            <p>
              Your contact details stay private. Ownership claims are checked by an administrator.
              <br />
              <strong>Because getting it right matters as much as getting it back.</strong>
            </p>
          </div>
        </div>
      </section>
      <section className="cf-categories section container">
        <div className="cf-section-heading" data-reveal>
          <div>
            <span className="eyebrow">
              <span className="cf-section-index">03 /</span>A PLACE FOR EVERYTHING
            </span>
            <h2>
              WHAT’S YOUR
              <br />
              <em>KIND OF LOST?</em>
            </h2>
          </div>
          <Link to="/browse" className="text-link">
            Browse everything
            <ArrowUpRight size={18} />
          </Link>
        </div>
        {categories.loading ? (
          <Loading />
        ) : categories.error ? (
          <ErrorState message={categories.error} />
        ) : (
          <div className="cf-category-list">
            {categories.data?.map((category, index) => (
              <Link
                className="cf-category-row"
                key={category.id}
                to={`/browse?categoryId=${category.id}`}
              >
                <span className="cf-category-number">0{index + 1}</span>
                <span className={`cf-category-object object-${index % 4}`}>
                  <CategoryIcon name={category.name} size={27} />
                </span>
                <strong>{category.name}</strong>
                <span className="cf-category-count">{category._count?.items ?? 0} open items</span>
                <span className="cf-category-arrow">
                  <ArrowUpRight size={23} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
      <section className="cf-callout container" data-reveal>
        <span className="cf-callout-orbit" aria-hidden="true" />
        <span className="eyebrow">BE THE GOOD PART OF SOMEONE’S DAY.</span>
        <h2>
          FOUND SOMETHING?
          <br />
          <span>
            THAT’S A <em>GOOD SIGN.</em>
          </span>
        </h2>
        <div className="cf-callout-bottom">
          <p>
            Somewhere on campus, someone’s retracing their steps.
            <br />
            You could be the reason they stop worrying.
          </p>
          <MagneticLink to="/report/found" className="button cf-button-lime">
            Let’s get it home
            <ArrowUpRight size={19} />
          </MagneticLink>
        </div>
        <span className="cf-callout-star" aria-hidden="true">
          ✳
        </span>
      </section>
    </main>
  );
}
function ArrowDownRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 5 14 14M5 19h14V5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
