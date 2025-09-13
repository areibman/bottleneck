import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../utils/cn';
import { useUIStore } from '../stores/uiStore';

interface MarkdownProps {
  content: string;
}

export function Markdown({ content }: MarkdownProps) {
  const { theme } = useUIStore();
  
  return (
    <div 
      className={cn(
        "prose prose-sm max-w-none", 
        theme === 'dark' ? "prose-invert" : "",
        "prose-pre:bg-transparent prose-pre:p-0"
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
