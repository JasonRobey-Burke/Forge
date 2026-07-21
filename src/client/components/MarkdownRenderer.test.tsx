import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import MarkdownRenderer from './MarkdownRenderer';

/**
 * Spec: docs/superpowers/specs/2026-07-21-markdown-formatting-design.md
 *
 * MarkdownRenderer gains an optional `variant?: 'block' | 'inline'` prop
 * (default 'block').
 *
 * - `block` (default): existing full `prose prose-sm dark:prose-invert`
 *   document typography treatment.
 * - `inline`: same GFM markdown support, but resets block margins and
 *   heading scaling and inherits the parent's font-size/color (e.g. via
 *   `prose-p:my-0`, tight leading, `text-inherit`) so it drops cleanly
 *   into small cards and list items.
 * - Both variants keep remarkGfm and react-markdown's default (no raw
 *   HTML), so untrusted YAML content cannot inject HTML/scripts.
 */

describe('MarkdownRenderer', () => {
  describe('block variant (default) — regression guard', () => {
    it('renders a level-1 heading as <h1>', () => {
      const { container } = render(<MarkdownRenderer content="# Heading" />);
      const h1 = container.querySelector('h1');
      expect(h1).not.toBeNull();
      expect(h1?.textContent).toBe('Heading');
    });

    it('renders a markdown list as <ul> with <li> items', () => {
      const { container } = render(<MarkdownRenderer content={'- a\n- b'} />);
      const ul = container.querySelector('ul');
      expect(ul).not.toBeNull();
      const items = ul?.querySelectorAll('li');
      expect(items?.length).toBe(2);
      expect(items?.[0].textContent).toBe('a');
      expect(items?.[1].textContent).toBe('b');
    });

    it('renders bold text as <strong>', () => {
      const { container } = render(<MarkdownRenderer content="**bold**" />);
      const strong = container.querySelector('strong');
      expect(strong).not.toBeNull();
      expect(strong?.textContent).toBe('bold');
    });

    it('explicit variant="block" behaves the same as the default (no variant)', () => {
      const { container } = render(
        <MarkdownRenderer content="# Heading" variant="block" />
      );
      const h1 = container.querySelector('h1');
      expect(h1).not.toBeNull();
      expect(h1?.textContent).toBe('Heading');
    });

    it('keeps the full block document typography treatment on the wrapper', () => {
      const { container } = render(
        <MarkdownRenderer content="text" variant="block" />
      );
      const wrapper = container.firstElementChild;
      expect(wrapper?.className).toContain('prose');
      expect(wrapper?.className).toContain('prose-h1:text-xl');
    });
  });

  describe('inline variant', () => {
    it('renders bold text as <strong>', () => {
      const { container } = render(
        <MarkdownRenderer content="**bold**" variant="inline" />
      );
      const strong = container.querySelector('strong');
      expect(strong).not.toBeNull();
      expect(strong?.textContent).toBe('bold');
    });

    it('renders inline code as <code>', () => {
      const { container } = render(
        <MarkdownRenderer content="`code`" variant="inline" />
      );
      const code = container.querySelector('code');
      expect(code).not.toBeNull();
      expect(code?.textContent).toBe('code');
    });

    it('still applies GFM markdown (renders a link)', () => {
      const { container } = render(
        <MarkdownRenderer
          content="[a link](https://example.com)"
          variant="inline"
        />
      );
      const link = container.querySelector('a');
      expect(link).not.toBeNull();
      expect(link?.getAttribute('href')).toBe('https://example.com');
    });

    it('does not emit heading elements — headings remap to bold inline text (a11y: no heading-outline pollution)', () => {
      // Per coordinator update: the inline variant must not emit real
      // <h1>-<h6> elements (they pollute the screen-reader heading
      // outline when dropped into small cards/list items). Markdown
      // headings should instead remap to a bold inline element.
      const { container } = render(
        <MarkdownRenderer content="# Heading text" variant="inline" />
      );
      expect(container.querySelector('h1,h2,h3,h4,h5,h6')).toBeNull();
      expect(container.textContent).toContain('Heading text');
      const strong = container.querySelector('strong');
      expect(strong).not.toBeNull();
      expect(strong?.textContent).toContain('Heading text');
    });

    it('resets block paragraph margins and heading scaling instead of the block prose treatment', () => {
      // Per the spec's Approach section: inline is "Implemented with prose
      // margin/color resets (e.g. prose-p:my-0, tight leading, text-inherit)
      // rather than a separate renderer" and must NOT carry the block-only
      // heading-scaling classes (e.g. prose-h1:text-xl).
      const { container } = render(
        <MarkdownRenderer content="some text" variant="inline" />
      );
      const wrapper = container.firstElementChild;
      expect(wrapper?.className).toContain('prose-p:my-0');
      expect(wrapper?.className).toContain('text-inherit');
      expect(wrapper?.className).not.toContain('prose-h1:text-xl');
    });
  });

  describe('no raw HTML injection', () => {
    it('renders a literal <script> tag as escaped text in the block variant', () => {
      const { container } = render(
        <MarkdownRenderer content="<script>alert(1)</script>" />
      );
      expect(container.querySelector('script')).toBeNull();
      expect(container.textContent).toContain('<script>alert(1)</script>');
    });

    it('renders a literal <script> tag as escaped text in the inline variant', () => {
      const { container } = render(
        <MarkdownRenderer
          content="<script>alert(1)</script>"
          variant="inline"
        />
      );
      expect(container.querySelector('script')).toBeNull();
      expect(container.textContent).toContain('<script>alert(1)</script>');
    });
  });
});
