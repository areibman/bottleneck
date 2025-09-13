import { useRef, useImperativeHandle, forwardRef, memo } from 'react';
import { cn } from '../utils/cn';
import { useUIStore } from '../stores/uiStore';

interface UncontrolledMarkdownEditorProps {
  defaultValue?: string;
  placeholder?: string;
  minHeight?: string;
  autoFocus?: boolean;
  className?: string;
  onChange?: (value: string) => void;
}

export interface UncontrolledMarkdownEditorRef {
  getValue: () => string;
  setValue: (value: string) => void;
  clear: () => void;
}

// Uncontrolled component - doesn't cause re-renders on every keystroke
export const UncontrolledMarkdownEditor = memo(forwardRef<
  UncontrolledMarkdownEditorRef,
  UncontrolledMarkdownEditorProps
>(function UncontrolledMarkdownEditor({
  defaultValue = '',
  placeholder = 'Write your comment here... (Markdown supported)',
  minHeight = '120px',
  autoFocus = false,
  className,
  onChange
}, ref) {
  const { theme } = useUIStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    getValue: () => textareaRef.current?.value || '',
    setValue: (value: string) => {
      if (textareaRef.current) {
        textareaRef.current.value = value;
      }
    },
    clear: () => {
      if (textareaRef.current) {
        textareaRef.current.value = '';
      }
    }
  }), []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      textarea.value = value.substring(0, start) + '  ' + value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 2;
      onChange?.(textarea.value);
    }
    
    // Cmd/Ctrl + B for bold
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const selectedText = value.substring(start, end);
      textarea.value = value.substring(0, start) + '**' + selectedText + '**' + value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 2 + selectedText.length;
      onChange?.(textarea.value);
    }
    
    // Cmd/Ctrl + I for italic
    if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const selectedText = value.substring(start, end);
      textarea.value = value.substring(0, start) + '*' + selectedText + '*' + value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 1 + selectedText.length;
      onChange?.(textarea.value);
    }
  };

  return (
    <div className={cn(
      "rounded-lg border overflow-hidden",
      theme === 'dark' ? "bg-gray-900 border-gray-700" : "bg-white border-gray-300",
      className
    )}>
      <textarea
        ref={textareaRef}
        defaultValue={defaultValue}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          "w-full p-4 resize-vertical focus:outline-none font-mono text-sm",
          theme === 'dark'
            ? "bg-gray-900 text-gray-100 placeholder-gray-500"
            : "bg-white text-gray-900 placeholder-gray-400"
        )}
        style={{ minHeight }}
      />
      <div className={cn(
        "px-3 py-1 text-xs border-t",
        theme === 'dark' 
          ? "bg-gray-800 border-gray-700 text-gray-500" 
          : "bg-gray-50 border-gray-200 text-gray-400"
      )}>
        <span>Markdown supported • Cmd+B bold • Cmd+I italic • Tab to indent</span>
      </div>
    </div>
  );
}));
