export type User = {
  id: number;
  fullName: string;
  email: string;
  role: 'STUDENT' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
};
export type Category = {
  id: number;
  name: string;
  description: string;
  _count?: { items: number };
};
export type Item = {
  id: number;
  userId: number;
  categoryId: number;
  category: Category;
  title: string;
  description: string;
  identifyingDetails?: string | null;
  type: 'LOST' | 'FOUND';
  location: string;
  eventDate: string;
  status: 'OPEN' | 'VERIFIED' | 'RETURNED' | 'WITHDRAWN';
  imagePath: string | null;
  createdAt: string;
  _count?: { claims: number };
};
export type Claim = {
  id: number;
  itemId: number;
  item: Item;
  claimantId: number;
  claimant?: { fullName: string };
  ownershipProof: string;
  identifyingDetails: string;
  supportingInformation?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote?: string;
  createdAt: string;
};
export type Activity = {
  id: number;
  action: string;
  entityType: string;
  entityId: number;
  createdAt: string;
  actor?: { fullName: string };
};
export type Dashboard = {
  total?: number;
  users?: number;
  lost: number;
  found: number;
  pending: number;
  returned: number;
  activity: Activity[];
};
export type Notification = { id: number; message: string; isRead: boolean; createdAt: string };
export type Meta = {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  unread?: number;
};
export type Response<T> = { data: T; meta?: Meta };
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}
let csrfToken: string | undefined;
export async function api<T>(url: string, options: RequestInit = {}): Promise<Response<T>> {
  const method = options.method ?? 'GET';
  const headers = new Headers(options.headers);
  if (!['GET', 'HEAD'].includes(method)) {
    if (!csrfToken) {
      const r = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
      if (!r.ok)
        throw new ApiError('Unable to start a secure request. Please try again.', r.status);
      csrfToken = (await r.json()).data.token;
    }
    headers.set('X-CSRF-Token', csrfToken!);
    if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`/api${url}`, { ...options, credentials: 'same-origin', headers });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 403) csrfToken = undefined;
    throw new ApiError(
      payload?.error?.message ?? 'Unable to connect to CampusFind. Please try again.',
      res.status,
      payload?.error?.fields,
    );
  }
  return payload;
}
export const json = (value: unknown) => JSON.stringify(value);
export const date = (value: string) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(value),
  );
export const friendly = (v: string) =>
  v
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
