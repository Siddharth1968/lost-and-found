import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { ObjectCollage } from '../creative/Motion';
import { useState } from 'react';
import { api, json, type User } from '../api';
import { useAuth, useToast } from '../hooks';
import { FieldError } from '../components';
const schema = z.object({
  fullName: z.string(),
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(12, 'Use at least 12 characters').max(72),
  confirmPassword: z.string(),
});
type Values = z.infer<typeof schema>;
export function AuthPage({ registerMode = false }: { registerMode?: boolean }) {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [error, setError] = useState('');
  const reduced = useReducedMotion();
  const validation = registerMode
    ? schema
        .refine((v) => v.fullName.trim().length >= 2, {
          path: ['fullName'],
          message: 'Enter your full name',
        })
        .refine((v) => v.password === v.confirmPassword, {
          path: ['confirmPassword'],
          message: 'Passwords must match',
        })
    : schema.extend({ password: z.string().min(1, 'Enter your password') });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(validation),
    defaultValues: { fullName: '', confirmPassword: '' },
  });
  if (user) return <Navigate to="/dashboard" replace />;
  async function submit(v: Values) {
    setError('');
    try {
      const { data } = await api<User>(registerMode ? '/auth/register' : '/auth/login', {
        method: 'POST',
        body: json(registerMode ? v : { email: v.email, password: v.password }),
      });
      setUser(data);
      toast(registerMode ? 'Welcome to the CampusFind community!' : 'Welcome back!');
      const from = location.state?.from;
      navigate(
        typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')
          ? from
          : '/dashboard',
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <main className="auth-page container">
      <aside className="auth-story">
        <span className="eyebrow">
          <span className="cf-pulse-dot" /> THE CAMPUS REUNION CLUB
        </span>
        <h1>
          GOOD THINGS.
          <br />
          GOOD PEOPLE.
          <br />
          <em>YOU’RE IN.</em>
        </h1>
        <p>
          Join a campus community that looks out for you
          <br />
          and the things that matter.
        </p>
        <div className="auth-illustration">
          <ObjectCollage compact />
          <span className="cf-auth-sticker">
            A LITTLE LESS LOST. <ArrowUpRight size={18} />
          </span>
        </div>
        <div className="auth-note">
          <ShieldCheck size={19} />
          Your details and ownership evidence stay private.
        </div>
      </aside>
      <motion.div
        className="auth-form-wrap"
        initial={reduced ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-form-head">
          <span className="community-pill">
            <span />
            {registerMode ? 'YOUR COMMUNITY STARTS HERE' : 'GOOD TO SEE YOU AGAIN'}
          </span>
          <h2>{registerMode ? 'Your good\nstarts here.' : 'Back for\nsomething good?'}</h2>
          <p>
            {registerMode
              ? 'Create your account. Help a little. Find a lot.'
              : 'Your next happy reunion could be waiting.'}
          </p>
        </div>
        <form onSubmit={handleSubmit(submit)} className="form-stack" noValidate>
          {registerMode && (
            <label>
              Full name
              <input autoComplete="name" placeholder="Your full name" {...register('fullName')} />
              <FieldError message={errors.fullName?.message} />
            </label>
          )}
          <label>
            Email address
            <input
              autoComplete="email"
              type="email"
              placeholder="you@college.edu"
              {...register('email')}
            />
            <FieldError message={errors.email?.message} />
          </label>
          <label>
            Password
            <input
              autoComplete={registerMode ? 'new-password' : 'current-password'}
              type="password"
              placeholder={registerMode ? 'At least 12 characters' : 'Your password'}
              {...register('password')}
            />
            <FieldError message={errors.password?.message} />
          </label>
          {registerMode && (
            <label>
              Confirm password
              <input
                autoComplete="new-password"
                type="password"
                placeholder="Once more, just to be sure"
                {...register('confirmPassword')}
              />
              <FieldError message={errors.confirmPassword?.message} />
            </label>
          )}
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <button className="button primary full" disabled={isSubmitting}>
            {isSubmitting ? 'One moment…' : registerMode ? 'Create my account' : 'Log in'}
            <ArrowRight size={17} />
          </button>
        </form>
        <p className="auth-switch">
          {registerMode ? 'Already part of the community?' : 'New around here?'}{' '}
          <Link to={registerMode ? '/login' : '/register'}>
            {registerMode ? 'Log in' : 'Create an account'}
          </Link>
        </p>
        <p className="auth-fine">
          CampusFind uses secure cookies to keep you signed in.
          <br />
          Your contact information is never shown on public listings.
        </p>
      </motion.div>
    </main>
  );
}
