import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// A placeholder for an escaped dollar sign (\$) while the text is split.
const MARK = '\u0000';

/**
 * Splits "Solve $x^2 + 3x$ for x" into text and formula parts.
 * $...$ is a formula inside the line, $$...$$ is a formula on its own line, and \$ is a plain dollar sign.
 */
function split(text) {
  const safe = String(text ?? '').replace(/\\\$/g, MARK);
  return safe
    .split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g)
    .filter((p) => p !== '')
    .map((p) => {
      if (p.length > 4 && p.startsWith('$$') && p.endsWith('$$')) {
        return { type: 'block', value: p.slice(2, -2).split(MARK).join('\\$') };
      }
      if (p.length > 2 && p.startsWith('$') && p.endsWith('$')) {
        return { type: 'inline', value: p.slice(1, -1).split(MARK).join('\\$') };
      }
      return { type: 'text', value: p.split(MARK).join('$') };
    });
}

function Formula({ type, value }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(value, {
        throwOnError: false, // a typo shows as red source text, not a crash
        displayMode: type === 'block',
        strict: 'ignore',
        trust: false, // no links or other unsafe commands
      });
    } catch {
      return null;
    }
  }, [type, value]);

  if (html === null) return <span>{type === 'block' ? `$$${value}$$` : `$${value}$`}</span>;
  // Only the output of the formula renderer goes in here. Plain text below is never inserted as HTML.
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Text with typed math. Plain parts are shown as text, only the formulas go through the renderer. */
export default function MathText({ text, className = '' }) {
  const parts = useMemo(() => split(text), [text]);

  return (
    <span className={`whitespace-pre-line break-words ${className}`}>
      {parts.map((p, i) =>
        p.type === 'text' ? <span key={i}>{p.value}</span> : <Formula key={i} type={p.type} value={p.value} />
      )}
    </span>
  );
}