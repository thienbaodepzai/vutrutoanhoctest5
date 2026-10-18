import React from 'react';
import { formatMathNotation } from '../utils/formatMath';
import { useMathVerse } from '../context/MathVerseContext';

interface FormattedMathViewProps {
  content: string;
  isUser?: boolean;
  className?: string;
}

/**
 * FormattedMathView:
 * Renders mathematical explanations and tutor replies with:
 * 1. Conversion of raw LaTeX symbols (\Rightarrow -> ⇒, \frac{a}{b} -> a/b, \le -> ≤, etc.)
 * 2. Proper Markdown bold (**text**) and italic (*text*) styling with theme-aware high contrast
 * 3. Structured line-by-line paragraph, bullet list, and step-by-step math layout
 */
export const FormattedMathView: React.FC<FormattedMathViewProps> = ({
  content,
  isUser = false,
  className = '',
}) => {
  const { theme } = useMathVerse();
  const isLight = theme === 'light';

  if (!content) return null;

  // Step 1: Clean LaTeX and math symbols
  const cleanedText = formatMathNotation(content);

  // Step 2: Split by newline to preserve paragraph structure
  const lines = cleanedText.split('\n');

  // Helper to parse inline bold (**text**) and italic (*text*)
  const renderInlineFormatted = (text: string, lineKey: string | number) => {
    // Regex splits by bold (**...**) and italic (*...*)
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);

    return parts.map((part, pIdx) => {
      const partKey = `${lineKey}-${pIdx}`;

      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        const inner = part.slice(2, -2);
        return (
          <strong
            key={partKey}
            className={`font-bold ${
              isUser
                ? 'text-white'
                : isLight
                ? 'text-indigo-900 bg-indigo-50/80 px-1 py-0.5 rounded'
                : 'text-cyan-200 bg-indigo-950/40 px-1 py-0.5 rounded'
            }`}
          >
            {inner}
          </strong>
        );
      }

      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
        const inner = part.slice(1, -1);
        return (
          <em
            key={partKey}
            className={`italic font-medium ${
              isUser
                ? 'text-cyan-100'
                : isLight
                ? 'text-amber-800 bg-amber-50/80 px-0.5 rounded'
                : 'text-amber-300'
            }`}
          >
            {inner}
          </em>
        );
      }

      return <React.Fragment key={partKey}>{part}</React.Fragment>;
    });
  };

  return (
    <div className={`space-y-1.5 leading-relaxed text-xs sm:text-sm ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty line -> vertical space
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Check if line is a bullet item
        const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-');
        const bulletText = isBullet ? trimmed.replace(/^[•\-]\s*/, '') : trimmed;

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 sm:pl-3">
              <span
                className={`text-xs mt-0.5 shrink-0 ${
                  isUser ? 'text-white' : isLight ? 'text-indigo-600 font-bold' : 'text-cyan-400 font-bold'
                }`}
              >
                •
              </span>
              <div className="flex-1">
                {renderInlineFormatted(bulletText, idx)}
              </div>
            </div>
          );
        }

        // Check if line is a numbered step (e.g. "1.", "2.", "Bước 1:", "Bước 2:")
        const isStep = /^Bước\s+\d+:?/i.test(trimmed) || /^\d+\.\s+/i.test(trimmed);

        return (
          <div
            key={idx}
            className={`${
              isStep && !isUser
                ? isLight
                  ? 'pl-2 border-l-2 border-indigo-600 bg-indigo-50/40 py-1 rounded-r-lg my-1'
                  : 'pl-2 border-l-2 border-cyan-400/80 bg-slate-900/60 py-1 rounded-r-lg my-1'
                : ''
            }`}
          >
            {renderInlineFormatted(line, idx)}
          </div>
        );
      })}
    </div>
  );
};
