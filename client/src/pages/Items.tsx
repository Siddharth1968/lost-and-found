import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Eye,
  ImagePlus,
  LockKeyhole,
  MapPin,
  Pencil,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, date, json, type Category, type Claim, type Item } from '../api';
import { useApi, useAuth, useToast } from '../hooks';
import {
  Badge,
  Empty,
  ErrorState,
  FieldError,
  ItemArt,
  Loading,
  PageIntro,
  SuccessPanel,
} from '../components';
import './ItemsCreative.css';
const reportSchema = z.object({
  title: z.string().trim().min(3, 'Use at least 3 characters').max(120),
  categoryId: z.coerce.number().int().positive('Choose a category'),
  description: z.string().trim().min(15, 'Add at least 15 characters').max(3000),
  location: z.string().trim().min(2, 'Add a campus location').max(160),
  eventDate: z
    .string()
    .min(1, 'Choose a date')
    .refine((v) => v <= new Date().toISOString().slice(0, 10), 'Date cannot be in the future'),
  identifyingDetails: z.string().max(2000),
});
type ReportValues = z.infer<typeof reportSchema>;
export function Report() {
  const { id, type } = useParams();
  return id ? (
    <EditReport id={id} />
  ) : type === 'lost' || type === 'found' ? (
    <ReportForm key={type} type={type === 'lost' ? 'LOST' : 'FOUND'} />
  ) : (
    <Empty
      title="Choose a lost or found report"
      action={
        <Link className="button primary" to="/report/lost">
          Report a lost item
        </Link>
      }
    />
  );
}
function EditReport({ id }: { id: string }) {
  const r = useApi<Item>(`/items/${id}`);
  const { user } = useAuth();
  if (r.loading) return <Loading />;
  if (r.error || !r.data) return <ErrorState message={r.error} />;
  if (r.data.userId !== user?.id || r.data.status !== 'OPEN' || r.data._count?.claims)
    return (
      <Empty
        title="This listing cannot be edited"
        text="Only your open listings without claims are eligible for editing."
      />
    );
  return <ReportForm key={r.data.id} type={r.data.type} initial={r.data} />;
}
const reportSteps = ['The essentials', 'The story & photo', 'Review & publish'];
function ReportForm({ type, initial }: { type: 'LOST' | 'FOUND'; initial?: Item }) {
  const categories = useApi<Category[]>('/categories');
  const navigate = useNavigate();
  const toast = useToast();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState('');
  const [imageError, setImageError] = useState('');
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(0);
  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReportValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      title: initial?.title ?? '',
      categoryId: initial?.categoryId ?? 0,
      description: initial?.description ?? '',
      location: initial?.location ?? '',
      eventDate: initial?.eventDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      identifyingDetails: initial?.identifyingDetails ?? '',
    },
  });
  const values = watch();
  const categoryName = categories.data?.find((c) => c.id === Number(values.categoryId))?.name;
  const photo = preview || initial?.imagePath;
  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (previousStep.current !== step) stepHeading.current?.focus({ preventScroll: true });
    previousStep.current = step;
  }, [step]);
  async function nextStep() {
    const fields: (keyof ReportValues)[] =
      step === 0
        ? ['title', 'categoryId', 'eventDate', 'location']
        : ['description', 'identifyingDetails'];
    if (step === 1 && imageError) {
      fileInput.current?.focus();
      return;
    }
    if (await trigger(fields, { shouldFocus: true })) setStep(Math.min(2, step + 1));
  }
  function formSubmit(event: FormEvent<HTMLFormElement>) {
    if (step < 2) {
      event.preventDefault();
      void nextStep();
      return;
    }
    void handleSubmit(submit, (invalid) => {
      setStep(invalid.title || invalid.categoryId || invalid.eventDate || invalid.location ? 0 : 1);
    })(event);
  }
  function removePhoto() {
    setFile(undefined);
    setImageError('');
    if (fileInput.current) fileInput.current.value = '';
  }
  async function submit(values: ReportValues) {
    if (imageError) {
      setStep(1);
      return;
    }
    setError('');
    const body = new FormData();
    Object.entries({ ...values, type }).forEach(([key, value]) => body.set(key, String(value)));
    if (file) body.set('image', file);
    try {
      const { data } = await api<Item>(initial ? `/items/${initial.id}` : '/items', {
        method: initial ? 'PATCH' : 'POST',
        body,
      });
      toast(
        initial
          ? 'Your listing has been updated.'
          : 'Your item is on the campus noticeboard. Thank you!',
      );
      navigate(`/items/${data.id}`);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <main className="container report-page cf-report-page">
      <Link to={initial ? `/items/${initial.id}` : '/browse'} className="back-link">
        <ArrowLeft size={16} /> Back to {initial ? 'item' : 'noticeboard'}
      </Link>
      <div className="cf-report-intro">
        <PageIntro
          eyebrow={initial ? 'A LITTLE UPDATE. A BETTER CHANCE.' : 'SMALL DETAILS. BIG REUNIONS.'}
          title={
            initial
              ? 'Fine-tune your find.'
              : type === 'LOST'
                ? 'Lost it? Let’s find it.'
                : 'Good find. Great human.'
          }
          description={
            type === 'LOST'
              ? 'Every reunion starts with a little detail. Give your missing thing a way home.'
              : 'That thing you found means something to someone. Let’s get it back to them.'
          }
        />
        <div className="cf-report-kind">
          <Sparkles size={18} />
          <Badge value={type} />
          <span>A little campus kindness</span>
        </div>
      </div>
      <div className="report-layout cf-report-layout">
        <form
          onSubmit={formSubmit}
          className="panel form-stack report-form cf-report-form"
          noValidate
        >
          <ol className="cf-report-steps" aria-label="Report progress">
            {reportSteps.map((label, index) => (
              <li
                key={label}
                className={index === step ? 'is-current' : index < step ? 'is-complete' : ''}
                aria-current={index === step ? 'step' : undefined}
              >
                <span className="cf-report-step-number">
                  {index < step ? <Check size={16} aria-hidden="true" /> : `0${index + 1}`}
                </span>
                <span>{label}</span>
              </li>
            ))}
          </ol>
          <div
            className="cf-report-progress"
            role="progressbar"
            aria-label="Report progress"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={3}
            aria-valuetext={`Step ${step + 1} of 3: ${reportSteps[step]}`}
          >
            <motion.span
              animate={{ width: `${((step + 1) / 3) * 100}%` }}
              transition={{ duration: reduceMotion ? 0 : 0.35 }}
            />
          </div>
          <div className="cf-report-stage-heading">
            <span className="eyebrow">STEP 0{step + 1} / 03</span>
            <h2 ref={stepHeading} tabIndex={-1}>
              {reportSteps[step]}
              <span>.</span>
            </h2>
            <p>
              {step === 0
                ? 'Start with the what, where, and when.'
                : step === 1
                  ? 'A good description makes all the difference.'
                  : 'One last look before your story goes live.'}
            </p>
          </div>
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={step}
              className="cf-report-stage"
              initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: reduceMotion ? 1 : 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
            >
              {step === 0 && (
                <>
                  <label htmlFor="report-title">
                    Give it a name <span className="required">*</span>
                    <input
                      id="report-title"
                      placeholder="e.g. Blue headphones with a well-loved case"
                      aria-invalid={!!errors.title}
                      aria-describedby={errors.title ? 'report-title-error' : undefined}
                      {...register('title')}
                      value={values.title}
                    />
                    <span id="report-title-error">
                      <FieldError message={errors.title?.message} />
                    </span>
                  </label>
                  <div className="form-row">
                    <label htmlFor="report-category">
                      Category <span className="required">*</span>
                      <select
                        id="report-category"
                        {...register('categoryId')}
                        value={String(values.categoryId)}
                        disabled={categories.loading}
                        aria-invalid={!!errors.categoryId}
                        aria-describedby="report-category-error"
                      >
                        <option value="0">Choose a category</option>
                        {categories.data?.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <span id="report-category-error">
                        <FieldError message={errors.categoryId?.message || categories.error} />
                      </span>
                    </label>
                    <label htmlFor="report-date">
                      Date {type === 'LOST' ? 'lost' : 'found'} <span className="required">*</span>
                      <input
                        id="report-date"
                        type="date"
                        max={new Date().toISOString().slice(0, 10)}
                        aria-invalid={!!errors.eventDate}
                        aria-describedby="report-date-error"
                        {...register('eventDate')}
                        value={values.eventDate}
                      />
                      <span id="report-date-error">
                        <FieldError message={errors.eventDate?.message} />
                      </span>
                    </label>
                  </div>
                  <label htmlFor="report-location">
                    {type === 'LOST' ? 'Where was it last seen?' : 'Where did you find it?'}{' '}
                    <span className="required">*</span>
                    <input
                      id="report-location"
                      placeholder="e.g. Central Library, second floor"
                      aria-invalid={!!errors.location}
                      aria-describedby="report-location-error"
                      {...register('location')}
                      value={values.location}
                    />
                    <span id="report-location-error">
                      <FieldError message={errors.location?.message} />
                    </span>
                  </label>
                  <p className="cf-report-field-note">
                    <MapPin size={17} /> A specific campus spot helps people connect the dots.
                  </p>
                </>
              )}
              {step === 1 && (
                <>
                  <label htmlFor="report-description">
                    Tell its story <span className="required">*</span>
                    <textarea
                      id="report-description"
                      rows={4}
                      placeholder="The colour, the condition, the place it was last seen… What would help someone recognise it?"
                      aria-invalid={!!errors.description}
                      aria-describedby="report-description-hint report-description-error"
                      {...register('description')}
                      value={values.description}
                    />
                    <span className="field-hint" id="report-description-hint">
                      Publicly visible. Keep serial numbers, ID numbers, and private contact details
                      out of this description.
                    </span>
                    <span id="report-description-error">
                      <FieldError message={errors.description?.message} />
                    </span>
                  </label>
                  <div className="cf-report-photo-field">
                    <label htmlFor="report-photo">
                      Add a photo <span className="optional">optional</span>
                    </label>
                    <div className={`upload-zone cf-report-upload ${photo ? 'has-photo' : ''}`}>
                      {photo ? (
                        <img
                          src={photo}
                          alt={
                            file ? 'Preview of your selected item photo' : 'Current listing photo'
                          }
                          className="cf-report-photo-preview"
                        />
                      ) : (
                        <span className="cf-report-photo-icon">
                          <ImagePlus size={30} />
                        </span>
                      )}
                      <div>
                        <strong>
                          {file
                            ? file.name
                            : initial?.imagePath
                              ? 'Choose a replacement photo'
                              : 'Drop a little visual clue'}
                        </strong>
                        <span>Choose a JPEG, PNG, or WebP · up to 5 MB</span>
                      </div>
                      <input
                        id="report-photo"
                        ref={fileInput}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        aria-describedby="report-photo-error"
                        aria-invalid={!!imageError}
                        onChange={(event) => {
                          const selected = event.target.files?.[0];
                          if (!selected) return;
                          if (
                            selected.size > 5 * 1024 * 1024 ||
                            !['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)
                          ) {
                            setImageError('Choose a JPEG, PNG, or WebP image smaller than 5 MB.');
                            setFile(undefined);
                            event.target.value = '';
                          } else {
                            setFile(selected);
                            setImageError('');
                          }
                        }}
                      />
                    </div>
                    <span id="report-photo-error">
                      <FieldError message={imageError} />
                    </span>
                    {file && (
                      <button
                        type="button"
                        className="reset-button cf-report-remove"
                        onClick={removePhoto}
                      >
                        <X size={14} /> Remove selected photo
                      </button>
                    )}
                    {imageError && (
                      <button
                        type="button"
                        className="reset-button cf-report-remove"
                        onClick={removePhoto}
                      >
                        Continue without a new photo
                      </button>
                    )}
                    {initial?.imagePath && (
                      <span className="field-hint">
                        Your current photo stays unless you choose a replacement.
                      </span>
                    )}
                  </div>
                  <label htmlFor="report-private">
                    <span className="cf-report-private-label">
                      <LockKeyhole size={15} /> Private identifying details{' '}
                      <span className="optional">optional</span>
                    </span>
                    <textarea
                      id="report-private"
                      rows={3}
                      placeholder="A unique mark, serial number, or something only the owner would know…"
                      aria-invalid={!!errors.identifyingDetails}
                      aria-describedby="report-private-hint report-private-error"
                      {...register('identifyingDetails')}
                      value={values.identifyingDetails}
                    />
                    <span className="field-hint" id="report-private-hint">
                      Visible only to you and administrators.
                    </span>
                    <span id="report-private-error">
                      <FieldError message={errors.identifyingDetails?.message} />
                    </span>
                  </label>
                </>
              )}
              {step === 2 && (
                <>
                  <div className="cf-report-review-label">
                    <Eye size={16} /> Your public listing preview
                  </div>
                  <article className="cf-report-review">
                    {photo && <img src={photo} alt="Item photo to be published" />}
                    <div className="cf-report-review-body">
                      <div className="cf-report-review-tags">
                        <Badge value={type} />
                        <span>{categoryName}</span>
                      </div>
                      <h3>{values.title}</h3>
                      <div className="cf-report-review-meta">
                        <span>
                          <MapPin size={15} />
                          {values.location}
                        </span>
                        <span>
                          <CalendarDays size={15} />
                          {values.eventDate ? date(values.eventDate) : ''}
                        </span>
                      </div>
                      <p>{values.description}</p>
                    </div>
                  </article>
                  <div className="cf-report-review-edits">
                    <button type="button" disabled={isSubmitting} onClick={() => setStep(0)}>
                      <Pencil size={14} /> Edit essentials
                    </button>
                    <button type="button" disabled={isSubmitting} onClick={() => setStep(1)}>
                      <Pencil size={14} /> Edit story & photo
                    </button>
                  </div>
                  <div className="cf-report-private-summary">
                    <ShieldCheck size={21} />
                    <div>
                      <strong>Your private details stay private.</strong>
                      <p>
                        {values.identifyingDetails?.trim()
                          ? 'Identifying details are included for you and administrators only.'
                          : 'You haven’t added any private identifying details.'}
                      </p>
                    </div>
                  </div>
                  <p className="cf-report-publish-note">
                    {initial
                      ? 'Saving updates your existing listing on the campus noticeboard.'
                      : 'Publishing adds your report to the campus noticeboard, where our community can help.'}
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <div className="form-submit cf-report-actions">
            {step > 0 ? (
              <button
                type="button"
                className="button secondary"
                disabled={isSubmitting}
                onClick={() => setStep((current) => current - 1)}
              >
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <Link
                to={initial ? `/items/${initial.id}` : '/my-items'}
                className="button secondary"
              >
                Cancel
              </Link>
            )}
            <button
              type="submit"
              className="button primary"
              disabled={isSubmitting || categories.loading || !!categories.error}
            >
              {isSubmitting
                ? 'Saving your listing…'
                : step < 2
                  ? 'Keep going'
                  : initial
                    ? 'Save changes'
                    : 'Publish my report'}
              <ArrowRight size={17} />
            </button>
          </div>
        </form>
        <aside className="report-aside cf-report-aside">
          <div className="cf-report-orbit" aria-hidden="true">
            <span />
            <span />
            <div>
              <ShieldCheck size={54} strokeWidth={1.3} />
            </div>
            <Sparkles className="cf-report-orbit-spark" size={30} />
            <span className="cf-report-orbit-dot" />
          </div>
          <span className="eyebrow">GOOD PEOPLE. GOOD THINGS.</span>
          <h3>
            A safe space.
            <br />A way back.
          </h3>
          <p>
            Your everyday things hold a lot of life. We help them find their way back, with a little
            care at every step.
          </p>
          <ul>
            <li>
              <CheckCircle2 size={18} />
              Only registered campus members can submit claims.
            </li>
            <li>
              <CheckCircle2 size={18} />
              Administrators verify ownership before arranging handover.
            </li>
            <li>
              <CheckCircle2 size={18} />
              Contact information and unique details stay off the public noticeboard.
            </li>
          </ul>
          <div className="aside-note">
            <span>A QUICK CAMPUS TIP</span>Found an ID or something valuable? Keep it with the
            campus lost and found desk while the owner is located.
          </div>
        </aside>
      </div>
    </main>
  );
}
const claimSchema = z.object({
  ownershipProof: z
    .string()
    .trim()
    .min(20, 'Tell us a little more (at least 20 characters)')
    .max(3000),
  identifyingDetails: z
    .string()
    .trim()
    .min(10, 'Add a unique detail (at least 10 characters)')
    .max(2000),
  supportingInformation: z.string().max(2000),
});
function ClaimForm({ item, close, done }: { item: Item; close: () => void; done: () => void }) {
  const toast = useToast();
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({
      behavior: reduceMotion ? 'instant' : 'smooth',
      block: 'center',
    });
  }, [reduceMotion]);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof claimSchema>>({ resolver: zodResolver(claimSchema) });
  async function submit(values: z.infer<typeof claimSchema>) {
    setError('');
    try {
      await api('/claims', { method: 'POST', body: json({ ...values, itemId: item.id }) });
      toast('Claim submitted. Your ownership evidence stays private.');
      done();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <motion.section
      className="panel claim-panel"
      id="item-claim-form"
      aria-labelledby="claim-title"
      initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.3 }}
    >
      <div className="panel-title">
        <h2 id="claim-title" ref={heading} tabIndex={-1}>
          Let’s verify that it’s yours.
        </h2>
        <button className="icon-button" onClick={close} aria-label="Close claim form">
          <X size={20} />
        </button>
      </div>
      <p>
        Tell our campus team what makes this item yours. Your answers are visible only to you and
        administrators.
      </p>
      <form className="form-stack" onSubmit={handleSubmit(submit)} noValidate>
        <label>
          How do you know this item is yours?
          <textarea
            rows={4}
            placeholder="Where and when did you lose it? What can help us verify ownership?"
            {...register('ownershipProof')}
          />
          <FieldError message={errors.ownershipProof?.message} />
        </label>
        <label>
          Private identifying details
          <textarea
            rows={3}
            placeholder="Describe a unique mark, engraving, contents, or other detail…"
            {...register('identifyingDetails')}
          />
          <FieldError message={errors.identifyingDetails?.message} />
        </label>
        <label>
          Anything else? <span className="optional">optional</span>
          <textarea rows={2} {...register('supportingInformation')} />
          <FieldError message={errors.supportingInformation?.message} />
        </label>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <button className="button primary" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting…' : 'Submit private ownership claim'}
          <ShieldCheck size={17} />
        </button>
      </form>
    </motion.section>
  );
}
function ReporterClaims({ id }: { id: number }) {
  const r = useApi<Pick<Claim, 'id' | 'status' | 'createdAt'>[]>(`/items/${id}/claims`);
  return (
    <section className="panel">
      <h3>Claims on your listing</h3>
      <p className="subtle">
        The campus team verifies ownership. Evidence and claimant contact information stay private.
      </p>
      {r.loading ? (
        <Loading />
      ) : r.error ? (
        <ErrorState message={r.error} />
      ) : !r.data?.length ? (
        <p>No claims yet. We’ll notify you when someone recognises this item.</p>
      ) : (
        r.data.map((c) => (
          <div className="simple-row" key={c.id}>
            <span>
              Claim #{c.id} · {date(c.createdAt)}
            </span>
            <Badge value={c.status} />
          </div>
        ))
      )}
    </section>
  );
}
export function ItemDetails() {
  const { id } = useParams();
  const r = useApi<Item>(`/items/${id}`);
  const { user } = useAuth();
  const [claimOpen, setClaimOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const claimButton = useRef<HTMLButtonElement>(null);
  const claimSuccess = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (!submitted) return;
    claimSuccess.current?.focus({ preventScroll: true });
    claimSuccess.current?.scrollIntoView({
      behavior: reduceMotion ? 'instant' : 'smooth',
      block: 'center',
    });
  }, [submitted, reduceMotion]);
  if (r.loading) return <Loading />;
  if (r.error || !r.data)
    return (
      <main className="container">
        <ErrorState message={r.error || 'Item not found.'} />
      </main>
    );
  const item = r.data;
  const own = item.userId === user?.id;
  return (
    <main className="container detail-page cf-detail-page">
      <Link to="/browse" className="back-link">
        <ArrowLeft size={16} />
        Back to noticeboard
      </Link>
      <div className="cf-detail-headline">
        <span>THE LITTLE DETAILS.</span>
        <span>CAMPUS NOTICEBOARD / #{String(item.id).padStart(4, '0')}</span>
      </div>
      <div className="detail-grid cf-detail-grid">
        <motion.div
          className="cf-detail-visual"
          initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.5 }}
        >
          <div className="detail-image cf-detail-image">
            <ItemArt item={item} large />
            <div className="photo-note">
              <ShieldCheck size={16} />
              Reported by a registered campus member
            </div>
          </div>
          <div className="cf-detail-sticker">
            <Sparkles size={19} />
            {item.status === 'RETURNED' ? 'A happy reunion.' : 'A little hope lives here.'}
          </div>
        </motion.div>
        <motion.section
          className="detail-info cf-detail-info"
          initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : 0.08 }}
        >
          <div className="detail-badges">
            <Badge value={item.type} />
            <Badge value={item.status} />
          </div>
          <span className="eyebrow">{item.category.name}</span>
          <h1>{item.title}</h1>
          <div className="detail-meta">
            <div className="cf-detail-meta-cell">
              <MapPin size={18} />
              <div>
                <small>{item.type === 'LOST' ? 'Last seen at' : 'Found at'}</small>
                <span>{item.location}</span>
              </div>
            </div>
            <div className="cf-detail-meta-cell">
              <CalendarDays size={18} />
              <div>
                <small>{item.type === 'LOST' ? 'Date lost' : 'Date found'}</small>
                <span>{date(item.eventDate)}</span>
              </div>
            </div>
          </div>
          <div className="detail-description">
            <h3>Every thing has a story.</h3>
            <p>{item.description}</p>
          </div>
          <div className="reported-date">
            Reported {date(item.createdAt)} · Listing #{item.id}
          </div>
          {submitted ? (
            <div ref={claimSuccess} tabIndex={-1} role="status">
              <SuccessPanel
                title="Your claim is on its way."
                text="An administrator will review your private details. Track the decision in My claims."
              />
            </div>
          ) : item.type === 'FOUND' && item.status === 'OPEN' && !own ? (
            <div className="cf-detail-claim">
              <h2>Look familiar?</h2>
              <p>If this little thing is yours, tell our campus team what makes it special.</p>
              {user ? (
                <button
                  ref={claimButton}
                  className="button primary full"
                  aria-expanded={claimOpen}
                  aria-controls={claimOpen ? 'item-claim-form' : undefined}
                  onClick={() => setClaimOpen(true)}
                >
                  <ShieldCheck size={18} />
                  This might be mine
                  <ArrowRight size={17} />
                </button>
              ) : (
                <Link
                  to="/login"
                  state={{ from: `/items/${item.id}` }}
                  className="button primary full"
                >
                  Log in to claim this item
                  <ArrowRight size={17} />
                </Link>
              )}
            </div>
          ) : own ? (
            <div className="notice">
              <ShieldCheck size={20} />
              <div>
                <strong>This is your listing.</strong>
                <p>Manage it from My listings.</p>
              </div>
              <Link to="/my-items" className="text-blue">
                View
                <ArrowRight size={15} />
              </Link>
            </div>
          ) : item.status === 'VERIFIED' ? (
            <SuccessPanel
              title="Ownership has been verified."
              text="This item is awaiting physical handover at the campus desk."
            />
          ) : item.status === 'RETURNED' ? (
            <SuccessPanel
              title="Another happy reunion."
              text="This item has made its way back to its owner."
            />
          ) : (
            <div className="notice">
              <ShieldCheck size={20} />
              <p>Have a lead? Bring the item or information to the campus lost and found desk.</p>
            </div>
          )}
          <p className="claim-privacy">
            <ShieldCheck size={16} />
            Ownership evidence is private. Approval and physical handover are separate steps.
          </p>
          {own && item.status === 'OPEN' && !item._count?.claims && (
            <Link className="button secondary full" to={`/items/${item.id}/edit`}>
              Edit my listing
            </Link>
          )}
        </motion.section>
      </div>
      {claimOpen && !submitted && (
        <ClaimForm
          item={item}
          close={() => {
            setClaimOpen(false);
            claimButton.current?.focus();
          }}
          done={() => {
            setSubmitted(true);
            setClaimOpen(false);
          }}
        />
      )}
      <div className="detail-extras cf-detail-extras">
        {(own || user?.role === 'ADMIN') && item.identifyingDetails && (
          <section className="panel">
            <h3>
              <ShieldCheck size={19} />
              Private identifying details
            </h3>
            <p>{item.identifyingDetails}</p>
          </section>
        )}
        {own && <ReporterClaims id={item.id} />}
      </div>
    </main>
  );
}
