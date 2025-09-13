import { useState, memo, lazy, Suspense } from 'react';
import { Check, Copy, WrapText, Hash, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';
import { useUIStore } from '../stores/uiStore';

// Lazy load the heavy syntax highlighter and styles together
const SyntaxHighlighterAsync = lazy(async () => {
  const [{ Prism }, { oneDark, oneLight }] = await Promise.all([
    import('react-syntax-highlighter'),
    import('react-syntax-highlighter/dist/esm/styles/prism')
  ]);
  
  // Return a component that handles the theme internally
  return {
    default: ({ theme, ...props }: any) => (
      <Prism style={theme === 'dark' ? oneDark : oneLight} {...props} />
    )
  };
});

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  filename?: string;
  className?: string;
}

// Memoize the entire component to prevent unnecessary re-renders
export const CodeBlock = memo(function CodeBlock({ 
  code, 
  language = 'plaintext', 
  filename,
  className 
}: CodeBlockProps) {
  const { theme } = useUIStore();
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);
  const [showLines, setShowLines] = useState(false); // Disabled by default
  const [collapsed, setCollapsed] = useState(false);
  
  // Count lines for collapsible feature
  const lineCount = code.split('\n').length;
  const shouldAllowCollapse = lineCount > 10;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const toggleLineNumbers = () => {
    setShowLines(!showLines);
  };

  const toggleWordWrap = () => {
    setWordWrap(!wordWrap);
  };

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  // Get display code based on collapsed state
  const displayCode = collapsed ? code.split('\n').slice(0, 5).join('\n') + '\n...' : code;

  // Map common language aliases
  const normalizeLanguage = (lang: string) => {
    const aliases: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'yml': 'yaml',
      'sh': 'bash',
      'shell': 'bash',
      'zsh': 'bash',
      'ps1': 'powershell',
      'c++': 'cpp',
      'c#': 'csharp',
      'objective-c': 'objectivec',
      'obj-c': 'objectivec',
    };
    return aliases[lang?.toLowerCase()] || lang?.toLowerCase() || 'plaintext';
  };

  const normalizedLanguage = normalizeLanguage(language);

  return (
    <div className={cn(
      "group relative rounded-lg overflow-hidden border",
      theme === 'dark' ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-200",
      className
    )}>
      {/* Header Bar */}
      <div className={cn(
        "flex items-center justify-between px-4 py-2 border-b",
        theme === 'dark' ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      )}>
        <div className="flex items-center gap-3">
          {/* Collapse Toggle */}
          {shouldAllowCollapse && (
            <button
              onClick={toggleCollapse}
              className={cn(
                "p-1 rounded transition-colors",
                theme === 'dark' 
                  ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200" 
                  : "hover:bg-gray-100 text-gray-600 hover:text-gray-800"
              )}
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
          
          {/* Language Badge */}
          <span className={cn(
            "text-xs font-medium px-2 py-1 rounded",
            theme === 'dark' 
              ? "bg-gray-700 text-gray-300" 
              : "bg-gray-100 text-gray-700"
          )}>
            {normalizedLanguage}
          </span>
          
          {/* Filename if provided */}
          {filename && (
            <span className={cn(
              "text-xs",
              theme === 'dark' ? "text-gray-400" : "text-gray-600"
            )}>
              {filename}
            </span>
          )}
          
          {/* Line count */}
          <span className={cn(
            "text-xs",
            theme === 'dark' ? "text-gray-500" : "text-gray-500"
          )}>
            {lineCount} lines {collapsed && '(collapsed)'}
          </span>
        </div>
        
        {/* Action Buttons - Fixed flickering with pointer-events */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
          {/* Toggle Line Numbers */}
          <button
            onClick={toggleLineNumbers}
            className={cn(
              "p-1.5 rounded transition-colors",
              theme === 'dark' 
                ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200" 
                : "hover:bg-gray-100 text-gray-600 hover:text-gray-800",
              showLines && (theme === 'dark' ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-800")
            )}
            title="Toggle line numbers"
          >
            <Hash className="w-4 h-4" />
          </button>
          
          {/* Toggle Word Wrap */}
          <button
            onClick={toggleWordWrap}
            className={cn(
              "p-1.5 rounded transition-colors",
              theme === 'dark' 
                ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200" 
                : "hover:bg-gray-100 text-gray-600 hover:text-gray-800",
              wordWrap && (theme === 'dark' ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-800")
            )}
            title="Toggle word wrap"
          >
            <WrapText className="w-4 h-4" />
          </button>
          
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={cn(
              "p-1.5 rounded transition-all",
              theme === 'dark' 
                ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200" 
                : "hover:bg-gray-100 text-gray-600 hover:text-gray-800",
              copied && "text-green-500"
            )}
            title="Copy code"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
      
      {/* Code Content - Fixed cursor */}
      <div className={cn(
        "relative overflow-auto cursor-text select-text",
        wordWrap ? "whitespace-pre-wrap break-words" : ""
      )}>
        <Suspense fallback={
          <pre className={cn(
            "p-4 text-sm leading-relaxed overflow-auto",
            theme === 'dark' ? "text-gray-300" : "text-gray-700"
          )}>
            <code>{displayCode}</code>
          </pre>
        }>
          <SyntaxHighlighterAsync
            theme={theme}
            language={normalizedLanguage}
            showLineNumbers={showLines}
            customStyle={{
              margin: 0,
              padding: '1rem',
              background: 'transparent',
              fontSize: '0.875rem',
              lineHeight: '1.5',
              cursor: 'text',
            }}
            lineNumberStyle={{
              minWidth: '2.5em',
              paddingRight: '1em',
              color: theme === 'dark' ? '#4a5568' : '#9ca3af',
              userSelect: 'none',
            }}
            wrapLines={wordWrap}
            wrapLongLines={wordWrap}
          >
            {displayCode}
          </SyntaxHighlighterAsync>
        </Suspense>
        
        {/* Expand button if collapsed */}
        {collapsed && (
          <button
            onClick={toggleCollapse}
            className={cn(
              "absolute bottom-2 left-1/2 transform -translate-x-1/2",
              "px-3 py-1 rounded text-xs font-medium",
              "transition-colors",
              theme === 'dark'
                ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
            )}
          >
            Show all {lineCount} lines
          </button>
        )}
      </div>
    </div>
  );
});
