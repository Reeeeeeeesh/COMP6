import { describe, it, expect } from 'vitest';

describe('environment smoke test', () => {
  it('document is available', () => {
    expect(typeof document).toBe('object');
    expect(['loading', 'interactive', 'complete']).toContain(document.readyState);
  });
});
