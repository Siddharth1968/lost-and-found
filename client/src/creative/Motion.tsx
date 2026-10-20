import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Backpack, CreditCard, Headphones, KeyRound, Sparkles, Star } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export function useEditorialMotion(root: RefObject<HTMLElement | null>) {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!root.current || reduced) return;
    const context = gsap.context(() => {
      gsap.from('.cf-title-word', {
        yPercent: 112,
        rotate: 2,
        duration: 1,
        stagger: 0.085,
        ease: 'power4.out',
        clearProps: 'transform',
      });
      gsap.from('.cf-hero-enter', {
        opacity: 0,
        y: 22,
        duration: 0.8,
        stagger: 0.08,
        delay: 0.5,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      });
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((element) => {
        gsap.from(element, {
          y: 34,
          opacity: 0,
          duration: 0.75,
          ease: 'power2.out',
          scrollTrigger: { trigger: element, start: 'top 91%', once: true },
          clearProps: 'transform,opacity',
        });
      });
      gsap.to('.cf-parallax-label', {
        y: -45,
        ease: 'none',
        scrollTrigger: { trigger: '.cf-hero', start: 'top top', end: 'bottom top', scrub: 1 },
      });
    }, root);
    return () => context.revert();
  }, [root, reduced]);
  useEffect(() => {
    if (reduced) return;
    const media = window.matchMedia('(min-width: 900px) and (pointer: fine)');
    let lenis: Lenis | undefined;
    const update = () => {
      lenis?.destroy();
      lenis = undefined;
      if (!media.matches) return;
      lenis = new Lenis({
        lerp: 0.1,
        smoothWheel: true,
        syncTouch: false,
        anchors: true,
        autoRaf: true,
      });
      lenis.on('scroll', ScrollTrigger.update);
    };
    update();
    media.addEventListener('change', update);
    return () => {
      media.removeEventListener('change', update);
      lenis?.destroy();
    };
  }, [reduced]);
}

export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotion();
  const number = useSpring(0, { stiffness: 75, damping: 22 });
  useEffect(() => {
    if (ref.current)
      ref.current.textContent = (reduced ? value : Math.round(number.get())).toLocaleString();
  }, [reduced, value, number]);
  useEffect(() => {
    if (inView) number.set(value);
  }, [value, inView, number]);
  useEffect(
    () =>
      number.on('change', (latest) => {
        if (ref.current && !reduced) ref.current.textContent = Math.round(latest).toLocaleString();
      }),
    [number, reduced],
  );
  return (
    <span className={className}>
      <span className="sr-only">{value.toLocaleString()}</span>
      <span ref={ref} aria-hidden="true">
        {reduced ? value.toLocaleString() : '0'}
      </span>
    </span>
  );
}

export function MagneticLink({
  to,
  className = '',
  children,
}: {
  to: string;
  className?: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 250, damping: 22 });
  const sy = useSpring(y, { stiffness: 250, damping: 22 });
  useEffect(() => {
    if (reduced) {
      x.set(0);
      y.set(0);
      sx.jump(0);
      sy.jump(0);
    }
  }, [reduced, x, y, sx, sy]);
  return (
    <motion.div
      className="cf-magnetic"
      style={{ x: sx, y: sy }}
      onPointerMove={(event) => {
        if (reduced || event.pointerType !== 'mouse') return;
        const r = event.currentTarget.getBoundingClientRect();
        x.set((event.clientX - r.left - r.width / 2) * 0.12);
        y.set((event.clientY - r.top - r.height / 2) * 0.17);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <Link className={className} to={to}>
        {children}
      </Link>
    </motion.div>
  );
}

export function useCardTilt() {
  const reduced = useReducedMotion();
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rx = useSpring(useTransform(y, [0, 1], [3, -3]), { stiffness: 250, damping: 25 });
  const ry = useSpring(useTransform(x, [0, 1], [-4, 4]), { stiffness: 250, damping: 25 });
  useEffect(() => {
    if (reduced) {
      x.set(0.5);
      y.set(0.5);
      rx.jump(0);
      ry.jump(0);
    }
  }, [reduced, x, y, rx, ry]);
  return {
    style: { rotateX: rx, rotateY: ry, transformPerspective: 1000 },
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
      if (reduced || event.pointerType !== 'mouse') return;
      const r = event.currentTarget.getBoundingClientRect();
      x.set((event.clientX - r.left) / r.width);
      y.set((event.clientY - r.top) / r.height);
    },
    onPointerLeave: () => {
      x.set(0.5);
      y.set(0.5);
    },
  };
}

const Scene = lazy(() => import('../scene/CampusScene'));
class SceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export function ObjectCollage({
  compact = false,
  hidden = false,
}: {
  compact?: boolean;
  hidden?: boolean;
}) {
  return (
    <div
      className={`cf-object-collage ${compact ? 'compact' : ''} ${hidden ? 'is-hidden' : ''}`}
      aria-hidden="true"
    >
      <div className="cf-clay-object cf-clay-headphones">
        <Headphones strokeWidth={1.5} />
        <span className="cf-clay-shine" />
      </div>
      <div className="cf-clay-object cf-clay-bag">
        <Backpack strokeWidth={1.3} />
        <span className="cf-clay-shine" />
      </div>
      <div className="cf-clay-object cf-clay-card">
        <CreditCard strokeWidth={1.2} />
        <i>
          YOUR STORY
          <br />
          ISN’T OVER.
        </i>
      </div>
      <div className="cf-clay-object cf-clay-keys">
        <KeyRound strokeWidth={1.8} />
      </div>
      <span className="cf-collage-star">
        <Star fill="currentColor" />
      </span>
    </div>
  );
}
export function HeroScene() {
  const reduced = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);
  const handleFailure = useCallback(() => {
    setFailed(true);
    setReady(false);
  }, []);
  useEffect(() => {
    if (!enabled || !visible) setReady(false);
  }, [enabled, visible]);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 900px) and (pointer: fine)');
    const update = () => {
      if (!media.matches || reduced) {
        setEnabled(false);
        return;
      }
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2');
        setEnabled(!!gl);
        if (gl) gl.getExtension('WEBGL_lose_context')?.loseContext();
      } catch {
        setEnabled(false);
      }
    };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [reduced]);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver((entries) => setVisible(entries[0].isIntersecting), {
      rootMargin: '120px',
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className="cf-scene-stage"
      role="img"
      aria-label="Original floating campus belongings: headphones, a backpack, bottle, phone and ID card"
    >
      <div className="cf-scene-grid" />
      <div className="cf-scene-orbit" />
      <div className="cf-scene-orbit second" />
      <ObjectCollage hidden={enabled && visible && ready && !failed} />
      {enabled && visible && !failed && (
        <div className="cf-live-scene">
          <SceneBoundary onFailure={handleFailure}>
            <Suspense fallback={null}>
              <Scene reducedMotion={!!reduced} onReady={handleReady} onFailure={handleFailure} />
            </Suspense>
          </SceneBoundary>
        </div>
      )}
      <div className="cf-scene-tag cf-parallax-label">
        <span className="cf-pulse-dot" /> STILL SOMEONE’S FAVOURITE.
      </div>
      <div className="cf-reunion-sticker">
        <Sparkles size={17} />
        <span>
          LESS LOST.
          <br />
          <strong>MORE FOUND.</strong>
        </span>
        <svg viewBox="0 0 50 50" aria-hidden="true">
          <path d="M8 26h30M27 12l14 14-14 14" />
        </svg>
      </div>
      <div className="cf-scene-coordinate">NOT JUST THINGS. SOMEONE’S THINGS.</div>
    </div>
  );
}
