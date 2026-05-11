'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  title: string;
  body: string;
}

export function TipBlock({ title, body }: Props) {
  return (
    <div className="border border-border">
      <div className="border-b border-border px-4 py-2">
        <span className="text-xs font-semibold text-white">{title}</span>
      </div>
      <div className="prose prose-invert prose-sm max-w-none px-4 py-4 [&_code]:rounded [&_code]:bg-surface [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-xs [&_h2]:font-semibold [&_h2]:tracking-widest [&_h2]:text-muted first:[&_h2]:mt-0 [&_li]:text-xs [&_li]:text-muted/90 [&_p]:text-xs [&_p]:text-muted/90 [&_strong]:text-white [&_table]:text-xs [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_td]:text-muted [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:text-[10px] [&_th]:tracking-widest [&_th]:text-muted/60">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      </div>
    </div>
  );
}
