import { describe, expect, it } from 'vitest';
import { claimInput, itemInput, itemQuery, registration } from '../src/validation.js';
const user = {
  fullName: 'Sample Student',
  email: 'STUDENT@example.test',
  password: 'a-long-test-password',
  confirmPassword: 'a-long-test-password',
};
const item = {
  title: 'Campus headphones',
  categoryId: 1,
  type: 'FOUND',
  description: 'Found headphones near a reading desk.',
  location: 'Library',
  eventDate: '2026-01-01',
};
describe('Request contracts', () => {
  it('normalizes email and forbids role injection', () => {
    expect(registration.parse(user).email).toBe('student@example.test');
    expect(registration.safeParse({ ...user, role: 'ADMIN' }).success).toBe(false);
  });
  it('requires matching passwords and rejects bcrypt byte truncation', () => {
    expect(registration.safeParse({ ...user, confirmPassword: 'different' }).success).toBe(false);
    expect(
      registration.safeParse({
        ...user,
        password: '界'.repeat(30),
        confirmPassword: '界'.repeat(30),
      }).success,
    ).toBe(false);
  });
  it('rejects invalid and future event dates', () => {
    for (const eventDate of ['2026-02-30', '2099-01-01', 'garbage'])
      expect(itemInput.safeParse({ ...item, eventDate }).success).toBe(false);
  });
  it('accepts valid lost and found reports without privileged fields', () => {
    for (const type of ['LOST', 'FOUND'])
      expect(itemInput.parse({ ...item, type }).eventDate).toBeInstanceOf(Date);
    expect(itemInput.safeParse({ ...item, status: 'RETURNED' }).success).toBe(false);
  });
  it('bounds pagination and filter values', () => {
    expect(itemQuery.parse({}).pageSize).toBe(12);
    for (const q of [{ page: -1 }, { pageSize: 1000 }, { sort: 'sql' }, { type: 'OTHER' }])
      expect(itemQuery.safeParse(q).success).toBe(false);
  });
  it('requires substantive private claim evidence', () => {
    expect(
      claimInput.safeParse({ itemId: 1, ownershipProof: 'mine', identifyingDetails: 'x' }).success,
    ).toBe(false);
  });
});
