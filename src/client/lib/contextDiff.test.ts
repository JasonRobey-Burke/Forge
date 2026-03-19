import { describe, it, expect } from 'vitest';
import { compareContext } from './contextDiff';

describe('compareContext', () => {
  const base = { stack: ['React'], patterns: ['MVC'], conventions: ['ESLint'], auth: 'JWT' };

  it('returns all inherited when identical', () => {
    const result = compareContext(base, { ...base });
    expect(result.anyModified).toBe(false);
  });

  it('detects modified stack', () => {
    const result = compareContext(base, { ...base, stack: ['Vue'] });
    expect(result.stack).toBe('modified');
    expect(result.anyModified).toBe(true);
  });

  it('detects modified auth', () => {
    const result = compareContext(base, { ...base, auth: 'OAuth2' });
    expect(result.auth).toBe('modified');
  });

  it('treats empty arrays as equal', () => {
    const empty = { stack: [], patterns: [], conventions: [], auth: '' };
    expect(compareContext(empty, { ...empty }).anyModified).toBe(false);
  });

  it('treats different array contents as modified', () => {
    expect(compareContext(base, { ...base, stack: ['React', 'Vue'] }).stack).toBe('modified');
  });
});
