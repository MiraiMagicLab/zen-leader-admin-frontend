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
import { cn } from '@/lib/utils';

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
};

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Nhập nội dung…',
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
    const url = window.prompt('URL liên kết');
    if (url?.trim()) {
      exec('createLink', url.trim());
      emitChange();
    }
  };

  return (
    <div className={cn('overflow-hidden rounded-md border bg-background', className)}>
      <div className="flex flex-wrap gap-1 border-b bg-muted/40 p-1">
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
          aria-label="In đậm"
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
          aria-label="In nghiêng"
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
          aria-label="Gạch chân"
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
          aria-label="Danh sách"
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
          aria-label="Danh sách số"
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
          aria-label="Chèn liên kết"
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
          aria-label="Xóa định dạng"
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
          'prose prose-sm dark:prose-invert max-w-none px-3 py-2 text-sm outline-none',
          'empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]',
          '[&_ul]:my-2 [&_ol]:my-2 [&_p]:my-1',
        )}
        style={{ minHeight }}
        onInput={emitChange}
        onBlur={emitChange}
      />
    </div>
  );
}
