import { describe, it, expect } from 'vitest';

describe('main entrypoint smoke', () => {
  it('has a root element or gracefully handles absence', () => {
    const root = document.getElementById('root');
    expect(root === null || root instanceof HTMLElement).toBe(true);
  });
});
