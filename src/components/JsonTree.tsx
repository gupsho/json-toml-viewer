import React, { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

interface JsonTreeProps {
  data: unknown;
  collapsedDepth?: number; // nodes deeper than this start collapsed
  searchTerm?: string;
}

const isObject = (val: unknown): val is Record<string, unknown> =>
  typeof val === "object" && val !== null && !Array.isArray(val);

const isPrimitive = (val: unknown): val is string | number | boolean | null =>
  val === null || ["string", "number", "boolean"].includes(typeof val);

const PrimitiveValue: React.FC<{ value: string | number | boolean | null; searchTerm?: string }> = ({ value, searchTerm }) => {
  const highlightText = (text: string, term?: string) => {
    if (!term || !term.trim()) return text;
    const regex = new RegExp(`(${term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-green-500/30 text-green-700 dark:text-green-300 px-0.5 rounded">
          {part}
        </span>
      ) : part
    );
  };

  if (value === null) return <span className="token-null">null</span>;
  switch (typeof value) {
    case "string":
      return <span className="token-string">"{highlightText(value, searchTerm)}"</span>;
    case "number":
      return <span className="token-number">{highlightText(String(value), searchTerm)}</span>;
    case "boolean":
      return <span className="token-boolean">{highlightText(String(value), searchTerm)}</span>;
    default:
      return <span>{highlightText(String(value), searchTerm)}</span>;
  }
};

const EntryRow: React.FC<{ label?: string; children?: React.ReactNode; searchTerm?: string }> = ({ label, children, searchTerm }) => {
  const highlightText = (text: string, term?: string) => {
    if (!term || !term.trim()) return text;
    const regex = new RegExp(`(${term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-green-500/30 text-green-700 dark:text-green-300 px-0.5 rounded">
          {part}
        </span>
      ) : part
    );
  };

  return (
    <div className="json-row flex items-start gap-2 py-0.5">
      {label !== undefined && (
        <span className="token-key select-none">
          {highlightText(label, searchTerm)}
          <span className="token-punc">: </span>
        </span>
      )}
      <span className="break-words">{children}</span>
    </div>
  );
};

const CollapsibleNode: React.FC<{
  label?: string;
  value: any;
  depth: number;
  collapsedDepth: number;
  searchTerm?: string;
}> = ({ label, value, depth, collapsedDepth, searchTerm }) => {
  const isArray = Array.isArray(value);
  const keys = isArray ? value.map((_: unknown, i: number) => String(i)) : Object.keys(value ?? {});
  
  // Function to check if this node or any of its children contain the search term
  const hasSearchMatch = (obj: any, term?: string): boolean => {
    if (!term || !term.trim()) return false;
    
    const searchLower = term.toLowerCase();
    
    if (isPrimitive(obj)) {
      return String(obj).toLowerCase().includes(searchLower);
    }
    
    if (Array.isArray(obj)) {
      return obj.some((item, index) => 
        String(index).toLowerCase().includes(searchLower) || 
        hasSearchMatch(item, term)
      );
    }
    
    if (isObject(obj)) {
      return Object.entries(obj).some(([key, val]) => 
        key.toLowerCase().includes(searchLower) || 
        hasSearchMatch(val, term)
      );
    }
    
    return false;
  };
  
  const shouldAutoExpand = searchTerm && hasSearchMatch(value, searchTerm);
  const [open, setOpen] = useState(depth < collapsedDepth || shouldAutoExpand);

  const toggle = () => setOpen((o) => !o);

  const openPunc = isArray ? "[" : "{";
  const closePunc = isArray ? "]" : "}";
  
  const highlightText = (text: string, term?: string) => {
    if (!term || !term.trim()) return text;
    const regex = new RegExp(`(${term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-green-500/30 text-green-700 dark:text-green-300 px-0.5 rounded">
          {part}
        </span>
      ) : part
    );
  };

  return (
    <div className="leading-6">
      <div className="group flex items-start gap-1">
        <button
          className="mt-0.5 rounded-sm p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          onClick={toggle}
          aria-label={open ? "Collapse" : "Expand"}
          aria-expanded={open}
        >
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <div className="flex-1">
          <span className="inline-flex items-baseline">
            {label !== undefined && (
              <span className="token-key select-none">
                {highlightText(label, searchTerm)}
                <span className="token-punc">: </span>
              </span>
            )}
            <span className="token-punc">{openPunc}</span>
            {!open && (
              <span className="text-muted-foreground">
                {isArray ? `${value.length} items` : `${keys.length} keys`}
              </span>
            )}
            {!open && <span className="token-punc">{closePunc}</span>}
          </span>
        </div>
      </div>

      {open && (
        <div className="ml-5 pl-3 border-l border-border">
          {isArray
            ? (value as unknown[]).map((v, i) => (
                <Node key={i} label={String(i)} value={v} depth={depth + 1} collapsedDepth={collapsedDepth} searchTerm={searchTerm} />
              ))
            : keys.map((k) => (
                <Node key={k} label={k} value={(value as Record<string, unknown>)[k]} depth={depth + 1} collapsedDepth={collapsedDepth} searchTerm={searchTerm} />
              ))}
        </div>
      )}

      {open && (
        <div className="ml-6">
          <span className="token-punc">{closePunc}</span>
        </div>
      )}
    </div>
  );
};

const Node: React.FC<{ label?: string; value: any; depth: number; collapsedDepth: number; searchTerm?: string }> = ({ label, value, depth, collapsedDepth, searchTerm }) => {
  if (isPrimitive(value)) {
    return (
      <EntryRow label={label} searchTerm={searchTerm}>
        <PrimitiveValue value={value} searchTerm={searchTerm} />
      </EntryRow>
    );
  }

  if (Array.isArray(value) || isObject(value)) {
    return <CollapsibleNode label={label} value={value} depth={depth} collapsedDepth={collapsedDepth} searchTerm={searchTerm} />;
  }

  // Fallback for functions/undefined (shouldn't exist in parsed JSON)
  return (
    <EntryRow label={label} searchTerm={searchTerm}>
      <span className="text-muted-foreground">{String(value)}</span>
    </EntryRow>
  );
};

const JsonTree: React.FC<JsonTreeProps> = ({ data, collapsedDepth = 1, searchTerm }) => {
  return (
    <div className="font-mono text-sm">
      {isPrimitive(data) ? (
        <EntryRow searchTerm={searchTerm}>
          <PrimitiveValue value={data} searchTerm={searchTerm} />
        </EntryRow>
      ) : Array.isArray(data) || isObject(data) ? (
        <Node value={data} depth={0} collapsedDepth={collapsedDepth} searchTerm={searchTerm} />
      ) : (
        <span className="text-muted-foreground">Unsupported data</span>
      )}
    </div>
  );
};

export default JsonTree;
