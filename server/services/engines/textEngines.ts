/**
 * Text Transformation Engines
 * Handles case-converter, duplicate-line-remover, sort-lines, text-cleaner
 */

/**
 * Case Converter: Transforms text into multiple casing conventions
 */
export function caseConverter(
  text: string,
  mode:
    | 'uppercase'
    | 'lowercase'
    | 'title'
    | 'sentence'
    | 'camel'
    | 'snake'
    | 'kebab'
    | 'pascal'
): {
  result: string;
  originalStats: { characters: number; words: number; lines: number };
  convertedStats: { characters: number; words: number };
} {
  const words = text.match(/\b\w+\b/g) || [];
  const lines = text.split('\n');

  let result = text;

  switch (mode) {
    case 'uppercase':
      result = text.toUpperCase();
      break;

    case 'lowercase':
      result = text.toLowerCase();
      break;

    case 'title':
      result = text.replace(
        /\w\S*/g,
        (w) => w.charAt(0).toUpperCase() + w.substring(1).toLowerCase()
      );
      break;

    case 'sentence':
      result = text
        .toLowerCase()
        .replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase());
      break;

    case 'camel': {
      const cleaned = text.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
      const parts = cleaned.split(/\s+/).filter(Boolean);
      result = parts
        .map((p, i) =>
          i === 0
            ? p.toLowerCase()
            : p.charAt(0).toUpperCase() + p.substring(1).toLowerCase()
        )
        .join('');
      break;
    }

    case 'pascal': {
      const cleaned = text.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
      const parts = cleaned.split(/\s+/).filter(Boolean);
      result = parts
        .map((p) => p.charAt(0).toUpperCase() + p.substring(1).toLowerCase())
        .join('');
      break;
    }

    case 'snake': {
      result = text
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase();
      break;
    }

    case 'kebab': {
      result = text
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
      break;
    }

    default:
      result = text;
  }

  const outWords = result.match(/\b\w+\b/g) || [];

  return {
    result,
    originalStats: {
      characters: text.length,
      words: words.length,
      lines: lines.length,
    },
    convertedStats: {
      characters: result.length,
      words: outWords.length,
    },
  };
}

/**
 * Duplicate Line Remover: Deduplicates lines from multi-line text
 */
export function duplicateLineRemover(
  text: string,
  options: {
    caseSensitive?: boolean;
    trimLines?: boolean;
    keepEmpty?: boolean;
  } = {}
): {
  result: string;
  originalLines: number;
  remainingLines: number;
  duplicatesRemoved: number;
} {
  const caseSensitive = options.caseSensitive !== false;
  const trimLines = options.trimLines !== false;
  const keepEmpty = options.keepEmpty === true;

  const rawLines = text.split(/\r?\n/);
  const seen = new Set<string>();
  const outputLines: string[] = [];
  let duplicatesRemoved = 0;

  for (const line of rawLines) {
    const processedLine = trimLines ? line.trim() : line;

    if (!processedLine && !keepEmpty) {
      continue;
    }

    const checkKey = caseSensitive ? processedLine : processedLine.toLowerCase();

    if (seen.has(checkKey)) {
      duplicatesRemoved++;
    } else {
      seen.add(checkKey);
      outputLines.push(processedLine);
    }
  }

  return {
    result: outputLines.join('\n'),
    originalLines: rawLines.length,
    remainingLines: outputLines.length,
    duplicatesRemoved,
  };
}

/**
 * Sort Lines: Sorts lines alphabetically, numerically, or by string length
 */
export function sortLines(
  text: string,
  options: {
    direction?: 'asc' | 'desc';
    type?: 'alphabetical' | 'numerical' | 'length';
    caseSensitive?: boolean;
    removeEmpty?: boolean;
  } = {}
): {
  result: string;
  lineCount: number;
  direction: 'asc' | 'desc';
  type: string;
} {
  const direction = options.direction === 'desc' ? 'desc' : 'asc';
  const type = options.type || 'alphabetical';
  const caseSensitive = options.caseSensitive === true;
  const removeEmpty = options.removeEmpty !== false;

  let lines = text.split(/\r?\n/);
  if (removeEmpty) {
    lines = lines.filter((l) => l.trim().length > 0);
  }

  lines.sort((a, b) => {
    let cmp = 0;
    if (type === 'numerical') {
      const numA = parseFloat(a.replace(/[^0-9.-]/g, '')) || 0;
      const numB = parseFloat(b.replace(/[^0-9.-]/g, '')) || 0;
      cmp = numA - numB;
    } else if (type === 'length') {
      cmp = a.length - b.length;
    } else {
      // Alphabetical
      cmp = caseSensitive ? a.localeCompare(b) : a.toLowerCase().localeCompare(b.toLowerCase());
    }
    return direction === 'asc' ? cmp : -cmp;
  });

  return {
    result: lines.join('\n'),
    lineCount: lines.length,
    direction,
    type,
  };
}

/**
 * Text Cleaner: Strips unwanted HTML, normalizes spaces, line breaks, non-ASCII
 */
export function textCleaner(
  text: string,
  options: {
    stripHtml?: boolean;
    removeExtraSpaces?: boolean;
    removeEmptyLines?: boolean;
    normalizeLineBreaks?: boolean;
    stripNonAscii?: boolean;
  } = {}
): {
  result: string;
  originalLength: number;
  cleanedLength: number;
  charsSaved: number;
} {
  let cleaned = text;

  // 1. Strip HTML tags
  if (options.stripHtml !== false) {
    cleaned = cleaned.replace(/<[^>]*>/g, ' ');
    cleaned = cleaned
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');
  }

  // 2. Normalize line breaks
  if (options.normalizeLineBreaks !== false) {
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  // 3. Remove non-ASCII characters if requested
  if (options.stripNonAscii === true) {
    cleaned = cleaned.replace(/[^\x00-\x7F]/g, '');
  }

  // 4. Remove extra spaces
  if (options.removeExtraSpaces !== false) {
    // Replace multiple horizontal spaces/tabs with single space per line
    cleaned = cleaned
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .join('\n');
  }

  // 5. Remove consecutive empty lines
  if (options.removeEmptyLines !== false) {
    cleaned = cleaned.replace(/\n\s*\n\s*\n+/g, '\n\n').trim();
  }

  return {
    result: cleaned,
    originalLength: text.length,
    cleanedLength: cleaned.length,
    charsSaved: text.length - cleaned.length,
  };
}
