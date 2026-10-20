import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Source modules live in server/src; compiled modules live in server/dist/src.
export function resolveClientDist(moduleUrl: string | URL): string {
  const sourceDirectory = path.dirname(fileURLToPath(moduleUrl));
  const sourceParent = path.dirname(sourceDirectory);
  const serverDirectory =
    path.basename(sourceParent) === 'dist' ? path.dirname(sourceParent) : sourceParent;
  return path.join(path.dirname(serverDirectory), 'client', 'dist');
}
