import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  variant?: 'block' | 'inline';
}

// a11y: the inline variant drops into small cards/list items, so markdown
// headings (# ... ######) must not emit real <h1>-<h6> elements — that would
// pollute the screen-reader heading outline of the surrounding page. Remap
// every heading level to a bold inline element instead.
function HeadingAsStrong({ children }: { children?: React.ReactNode }) {
  return <strong className="font-semibold">{children}</strong>;
}

const INLINE_COMPONENTS: Components = {
  h1: HeadingAsStrong,
  h2: HeadingAsStrong,
  h3: HeadingAsStrong,
  h4: HeadingAsStrong,
  h5: HeadingAsStrong,
  h6: HeadingAsStrong,
};

const BLOCK_CLASSNAME =
  'prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-pre:bg-muted prose-pre:border prose-code:text-sm';

// minimal: inline variant reuses the block prose ruleset with margin/heading
// resets layered on rather than a dedicated inline typography scale; revisit
// with a purpose-built inline preset if these resets prove insufficient.
const INLINE_CLASSNAME =
  'prose prose-sm dark:prose-invert max-w-none text-inherit prose-p:my-0 prose-p:leading-tight prose-headings:my-0 prose-headings:font-semibold prose-headings:text-inherit prose-ul:my-0 prose-ol:my-0 prose-li:my-0 prose-pre:bg-muted prose-pre:border prose-code:text-sm';

export default function MarkdownRenderer({
  content,
  variant = 'block',
}: MarkdownRendererProps) {
  const className = variant === 'inline' ? INLINE_CLASSNAME : BLOCK_CLASSNAME;
  const components = variant === 'inline' ? INLINE_COMPONENTS : undefined;
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
