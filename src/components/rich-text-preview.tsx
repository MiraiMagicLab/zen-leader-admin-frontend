import { cn } from '@/lib/utils';

type RichTextPreviewProps = {
  value: string | null | undefined;
  className?: string;
  emptyMessage?: string;
};

export function RichTextPreview({
  value,
  className,
  emptyMessage = 'Chưa có nội dung mô tả.',
}: RichTextPreviewProps) {
  if (!value?.trim()) {
    return <p className={cn('text-muted-foreground text-sm', className)}>{emptyMessage}</p>;
  }

  return (
    <div
      className={cn(
        'prose prose-sm max-w-none text-sm',
        '[&_a]:text-primary [&_a]:underline [&_ol]:pl-5 [&_ul]:pl-5',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );
}
