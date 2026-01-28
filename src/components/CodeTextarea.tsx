import React, { useEffect, useMemo, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

export type ErrorPos = { line: number; column: number } | null;

interface CodeTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  errorPos?: ErrorPos;
  searchTerm?: string;
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function indexFromLineCol(text: string, line: number, column: number) {
  const lines = text.split(/\r?\n/);
  const l = Math.max(1, Math.min(line, lines.length));
  const c = Math.max(1, column);
  let idx = 0;
  for (let i = 0; i < l - 1; i++) idx += lines[i].length + 1; // +1 for \n
  idx += c - 1;
  if (idx < 0) idx = 0;
  if (idx > text.length) idx = text.length;
  return idx;
}

const CodeTextarea: React.FC<CodeTextareaProps> = ({
  value,
  onChange,
  className,
  placeholder,
  errorPos = null,
  searchTerm = "",
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const highlightedHtml = useMemo(() => {
    let html = escapeHtml(value);
    
    // Apply search highlighting first
    if (searchTerm && searchTerm.trim()) {
      const regex = new RegExp(`(${escapeHtml(searchTerm.trim()).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      html = html.replace(regex, '<span style="background-color: rgba(34, 197, 94, 0.3); color: rgb(21, 128, 61);">$1</span>');
    }
    
    // Apply error highlighting on top of search highlighting
    if (errorPos) {
      const { line, column } = errorPos;
      const start = indexFromLineCol(value, line, column);
      const before = value.slice(0, start);
      const errChar = value[start] ?? "";
      const after = value.slice(start + (errChar ? 1 : 0));

      const beforeHtml = searchTerm && searchTerm.trim() ? 
        before.replace(new RegExp(`(${searchTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<span style="background-color: rgba(34, 197, 94, 0.3); color: rgb(21, 128, 61);">$1</span>') : 
        escapeHtml(before);
      
      const afterHtml = searchTerm && searchTerm.trim() ? 
        after.replace(new RegExp(`(${searchTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<span style="background-color: rgba(34, 197, 94, 0.3); color: rgb(21, 128, 61);">$1</span>') : 
        escapeHtml(after);

      const errorSpanOpen = '<span style="background-color: rgba(239, 68, 68, 0.4); border-bottom: 2px solid rgb(239, 68, 68); color: rgb(239, 68, 68);">';
      const errorSpanClose = "</span>";

      return (
        beforeHtml +
        errorSpanOpen +
        (errChar ? escapeHtml(errChar) : "&nbsp;") +
        errorSpanClose +
        afterHtml
      );
    }
    
    return html;
  }, [value, errorPos, searchTerm]);

  const syncOverlayScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const overlay = overlayRef.current;
    if (!textarea || !overlay) return;
    
    overlay.scrollTop = textarea.scrollTop;
    overlay.scrollLeft = textarea.scrollLeft;
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('scroll', syncOverlayScroll);
      return () => textarea.removeEventListener('scroll', syncOverlayScroll);
    }
  }, [syncOverlayScroll]);

  useEffect(() => {
    syncOverlayScroll();
  }, [value, syncOverlayScroll]);

  // Show overlay for error or search highlighting
  if (errorPos || (searchTerm && searchTerm.trim())) {
    return (
      <div className="relative w-full">
        <div 
          ref={containerRef}
          className="relative"
          style={{ position: 'relative' }}
        >
          {/* Background highlight overlay */}
          <div
            ref={overlayRef}
            className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none overflow-hidden"
            style={{
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '14px',
              fontFamily: 'JetBrains Mono, ui-monospace, monospace',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              color: 'transparent',
              background: 'hsl(var(--background))',
              zIndex: 1
            }}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            aria-invalid={!!errorPos}
            className={cn(
              "flex min-h-[80px] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono leading-6",
              "relative z-10",
              className
            )}
            style={{
              background: 'transparent',
              color: 'inherit'
            }}
            {...props}
          />
        </div>
        
        {errorPos && (
          <div className="mt-1 text-xs text-destructive">
            Parse error at line {errorPos.line}, column {errorPos.column}
          </div>
        )}
      </div>
    );
  }

  // Simple textarea when no error
  return (
    <div className="relative w-full">
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(
          "flex min-h-[80px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono leading-6",
          className
        )}
        {...props}
      />
    </div>
  );
};

export default CodeTextarea;