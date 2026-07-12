import { useCallback, useEffect, useRef } from 'react';
import {
  Bold,
  Italic,
  Link,
  List,
  ListOrdered,
  RemoveFormatting,
  Underline,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
};

const FONT_SIZE_OPTIONS = [
  { value: '12px', label: '12' },
  { value: '14px', label: '14' },
  { value: '16px', label: '16' },
  { value: '18px', label: '18' },
  { value: '24px', label: '24' },
  { value: '32px', label: '32' },
] as const;

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

const ALLOWED_PASTE_TAGS = new Set([
  'P',
  'BR',
  'B',
  'STRONG',
  'I',
  'EM',
  'U',
  'A',
  'UL',
  'OL',
  'LI',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'BLOCKQUOTE',
  'SUB',
  'SUP',
  'IMG',
  'HR',
  'DIV',
  'SPAN',
]);

/**
 * Sanitize pasted HTML: keep semantic formatting (bold, italic, underline,
 * headings, lists, links, font-size spans) but strip unrelated styles,
 * class names, and non-semantic wrapper tags (font, center, etc.).
 */
function sanitizePastedHtml(rawHtml: string): string {
  const doc = new DOMParser().parseFromString(rawHtml, 'text/html');

  function walk(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.parentNode?.removeChild(node);
      return;
    }

    const el = node as HTMLElement;
    const tag = el.tagName;

    // Recurse into children first so removals don't break iteration
    const children = Array.from(el.childNodes);
    for (const child of children) {
      walk(child);
    }

    const preservedFontSize = tag === 'SPAN' ? el.style.fontSize.trim() : '';

    // Strip presentation attributes
    el.removeAttribute('style');
    el.removeAttribute('class');
    el.removeAttribute('color');
    el.removeAttribute('bgcolor');
    el.removeAttribute('background');
    el.removeAttribute('face');
    el.removeAttribute('size');
    el.removeAttribute('width');
    el.removeAttribute('height');
    el.removeAttribute('align');

    if (preservedFontSize) {
      el.style.fontSize = preservedFontSize;
    }

    // For <a> tags, keep only the href
    if (tag === 'A') {
      const href = el.getAttribute('href');
      for (const attr of Array.from(el.attributes)) {
        if (attr.name !== 'href') {
          el.removeAttribute(attr.name);
        }
      }
      if (!href) {
        // Unwrap links without href — replace with text content
        const text = document.createTextNode(el.textContent ?? '');
        el.parentNode?.replaceChild(text, el);
        return;
      }
    }

    // For <img> tags, keep only src and alt
    if (tag === 'IMG') {
      const src = el.getAttribute('src');
      const alt = el.getAttribute('alt') ?? '';
      for (const attr of Array.from(el.attributes)) {
        if (attr.name !== 'src' && attr.name !== 'alt') {
          el.removeAttribute(attr.name);
        }
      }
      if (!src) {
        el.parentNode?.removeChild(el);
        return;
      }
      el.setAttribute('alt', alt);
    }

    // Unwrap disallowed tags — keep their children
    if (!ALLOWED_PASTE_TAGS.has(tag)) {
      const parent = el.parentNode;
      if (!parent) return;
      while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
      }
      parent.removeChild(el);
    }
  }

  for (const child of Array.from(doc.body.childNodes)) {
    walk(child);
  }

  return doc.body.innerHTML;
}

/**
 * Applies a CSS font-size to the current selection via temporary fontSize
 * execCommand, then normalizes <font> wrappers into semantic <span style>.
 */
function applyFontSize(size: string, editor: HTMLDivElement | null) {
  if (!editor) {
    return;
  }

  editor.focus();
  exec('fontSize', '7');

  const fonts = editor.querySelectorAll('font[size="7"]');
  fonts.forEach((font) => {
    const span = document.createElement('span');
    span.style.fontSize = size;
    while (font.firstChild) {
      span.appendChild(font.firstChild);
    }
    font.parentNode?.replaceChild(span, font);
  });
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter content…',
  className,
  minHeight = '12rem',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef(value);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || el.innerHTML === value) {
      return;
    }
    el.innerHTML = value || '';
    lastHtmlRef.current = value;
  }, [value]);

  const emitChange = useCallback(() => {
    const el = editorRef.current;
    if (!el) {
      return;
    }
    const html = el.innerHTML === '<br>' ? '' : el.innerHTML;
    if (html !== lastHtmlRef.current) {
      lastHtmlRef.current = html;
      onChange(html);
    }
  }, [onChange]);

  const handleLink = () => {
    const url = window.prompt('Link URL');
    if (url?.trim()) {
      exec('createLink', url.trim());
      emitChange();
    }
  };

  const handleFontSize = (size: string) => {
    applyFontSize(size, editorRef.current);
    emitChange();
  };

  return (
    <div className={cn('rounded-md border bg-background', className)}>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b bg-muted/95 p-1 backdrop-blur supports-backdrop-filter:bg-muted/80">
        <Select onValueChange={handleFontSize}>
          <SelectTrigger
            size="sm"
            className="h-8 w-[4.5rem] shrink-0 border-transparent bg-transparent shadow-none"
            aria-label="Font size"
            onMouseDown={(e) => e.preventDefault()}
          >
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            exec('bold');
            emitChange();
          }}
          aria-label="Bold"
        >
          <Bold className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            exec('italic');
            emitChange();
          }}
          aria-label="Italic"
        >
          <Italic className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            exec('underline');
            emitChange();
          }}
          aria-label="Underline"
        >
          <Underline className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            exec('insertUnorderedList');
            emitChange();
          }}
          aria-label="Bullet list"
        >
          <List className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            exec('insertOrderedList');
            emitChange();
          }}
          aria-label="Numbered list"
        >
          <ListOrdered className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleLink}
          aria-label="Insert link"
        >
          <Link className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            exec('removeFormat');
            emitChange();
          }}
          aria-label="Clear formatting"
        >
          <RemoveFormatting className="size-4" />
        </Button>
      </div>
      <div
        ref={editorRef}
        role="textbox"
        aria-multiline
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className={cn(
          'text-foreground max-w-none px-3 py-2 text-sm outline-none',
          'empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]',
          '[&_ul]:my-2 [&_ol]:my-2 [&_p]:my-1',
        )}
        style={{ minHeight }}
        onInput={emitChange}
        onBlur={emitChange}
        onPaste={(e) => {
          const html = e.clipboardData.getData('text/html');
          if (!html) return; // plain text paste — let the browser handle it
          e.preventDefault();
          const clean = sanitizePastedHtml(html);
          exec('insertHTML', clean);
          emitChange();
        }}
      />
    </div>
  );
}
