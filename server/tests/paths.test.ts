import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resolveClientDist } from '../src/paths.js';

describe.each(['CampusFind', 'CampusFind with spaces'])('Client build path in %s', (name) => {
  const repository = path.resolve('fixtures', name);
  const expected = path.join(repository, 'client', 'dist');

  it('resolves source execution inside the same repository', () => {
    const sourceUrl = pathToFileURL(path.join(repository, 'server', 'src', 'app.ts'));
    expect(resolveClientDist(sourceUrl)).toBe(expected);
  });

  it('resolves compiled execution to the same client build', () => {
    const compiledUrl = pathToFileURL(path.join(repository, 'server', 'dist', 'src', 'app.js'));
    expect(resolveClientDist(compiledUrl.href)).toBe(expected);
  });
});
