import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Components } from 'react-markdown';
import { cn } from '../utils/cn';
import { useUIStore } from '../stores/uiStore';
import { CodeBlock } from './CodeBlock';

interface MarkdownProps {
  content: string;
}

export function Markdown({ content }: MarkdownProps) {
  const { theme } = useUIStore();
  
  // Custom components for ReactMarkdown
  const components: Components = {
    // Custom code block rendering
    code({ node, className, children, ...props }: any) {
      const inline = !className?.startsWith('language-');
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : undefined;
      const codeString = String(children).replace(/\n$/, '');
      
      // For inline code, use default styling
      if (inline) {
        return (
          <code 
            className={cn(
              "px-1.5 py-0.5 rounded text-sm font-medium",
              theme === 'dark'
                ? "bg-gray-800 text-gray-200 border border-gray-700"
                : "bg-gray-100 text-gray-800 border border-gray-200"
            )}
            {...props}
          >
            {children}
          </code>
        );
      }
      
      // For code blocks, use our custom CodeBlock component
      return (
        <CodeBlock 
          code={codeString}
          language={language}
          showLineNumbers={false} // Line numbers disabled by default
          className="my-4"
        />
      );
    },
    // Custom pre tag to prevent double wrapping
    pre({ children }) {
      return <>{children}</>;
    }
  };
  
  return (
    <div 
      className={cn(
        "prose prose-sm max-w-none markdown-content",
        theme === 'dark' ? "prose-invert" : "prose-light",
        // Base prose styles
        "prose-headings:font-semibold",
        "prose-p:leading-relaxed",
        "prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline",
        // Remove default pre/code styles since we're using custom components
        "[&>pre]:contents",
        // Table styles
        "prose-table:border-collapse",
        theme === 'dark'
          ? "prose-th:border-gray-600 prose-td:border-gray-700"
          : "prose-th:border-gray-300 prose-td:border-gray-200",
        // List styles
        "prose-ul:list-disc prose-ol:list-decimal",
        // Blockquote styles
        theme === 'dark'
          ? "prose-blockquote:border-gray-600 prose-blockquote:text-gray-300"
          : "prose-blockquote:border-gray-300 prose-blockquote:text-gray-600"
      )}
    >
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
