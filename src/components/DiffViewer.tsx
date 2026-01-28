import React from 'react';
import { diffJson } from 'diff';

interface DiffViewerProps {
  leftData: any;
  rightData: any;
  leftLabel?: string;
  rightLabel?: string;
}

const DiffViewer: React.FC<DiffViewerProps> = ({
  leftData,
  rightData,
  leftLabel = "Left",
  rightLabel = "Right"
}) => {
  // Recursively sort object keys for consistent comparison
  const sortObjectKeys = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) {
      return obj.map(sortObjectKeys);
    }
    if (typeof obj === 'object') {
      const sorted: any = {};
      Object.keys(obj)
        .sort()
        .forEach(key => {
          sorted[key] = sortObjectKeys(obj[key]);
        });
      return sorted;
    }
    return obj;
  };

  // Pretty print JSON with proper formatting and sorted keys
  const formatJson = (data: any) => {
    if (!data) return '';
    try {
      const sortedData = sortObjectKeys(data);
      return JSON.stringify(sortedData, null, 2);
    } catch (error) {
      return String(data);
    }
  };
  
  const leftJson = formatJson(leftData);
  const rightJson = formatJson(rightData);
  
  const diff = diffJson(leftJson, rightJson);

  // Process left side (original) - show removed and unchanged lines
  const leftContent: Array<{ lineNum: number; text: string; isRemoved: boolean }> = [];
  let leftLineNum = 1;
  
  diff.forEach((part) => {
    if (!part.added) { // Show removed and unchanged
      const lines = part.value.split('\n');
      lines.forEach((line, idx) => {
        // Skip the last empty line from split
        if (idx === lines.length - 1 && line === '') return;
        leftContent.push({
          lineNum: leftLineNum++,
          text: line,
          isRemoved: part.removed || false
        });
      });
    }
  });

  // Process right side (modified) - show added and unchanged lines
  const rightContent: Array<{ lineNum: number; text: string; isAdded: boolean }> = [];
  let rightLineNum = 1;
  
  diff.forEach((part) => {
    if (!part.removed) { // Show added and unchanged
      const lines = part.value.split('\n');
      lines.forEach((line, idx) => {
        // Skip the last empty line from split
        if (idx === lines.length - 1 && line === '') return;
        rightContent.push({
          lineNum: rightLineNum++,
          text: line,
          isAdded: part.added || false
        });
      });
    }
  });

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {/* Left side */}
      <div className="border-r border-border">
        <div className="p-3 bg-muted/50 border-b border-border">
          <h3 className="font-medium text-sm">{leftLabel}</h3>
        </div>
        <div className="font-mono text-xs">
          {leftContent.map((line, idx) => (
            <div key={idx} className="flex">
              {/* Line number */}
              <div className="bg-muted/30 px-3 py-1 text-muted-foreground text-right select-none border-r border-border min-w-[3rem] shrink-0">
                {line.lineNum}
              </div>
              {/* Content */}
              <div
                className={`flex-1 px-4 py-1 whitespace-pre-wrap break-words ${
                  line.isRemoved ? 'bg-red-100 text-red-800' : ''
                }`}
                style={{ wordBreak: 'break-all' }}
              >
                {line.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right side */}
      <div>
        <div className="p-3 bg-muted/50 border-b border-border">
          <h3 className="font-medium text-sm">{rightLabel}</h3>
        </div>
        <div className="font-mono text-xs">
          {rightContent.map((line, idx) => (
            <div key={idx} className="flex">
              {/* Line number */}
              <div className="bg-muted/30 px-3 py-1 text-muted-foreground text-right select-none border-r border-border min-w-[3rem] shrink-0">
                {line.lineNum}
              </div>
              {/* Content */}
              <div
                className={`flex-1 px-4 py-1 whitespace-pre-wrap break-words ${
                  line.isAdded ? 'bg-green-100 text-green-800' : ''
                }`}
                style={{ wordBreak: 'break-all' }}
              >
                {line.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DiffViewer;