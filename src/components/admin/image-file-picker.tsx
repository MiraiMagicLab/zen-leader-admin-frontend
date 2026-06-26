import { useEffect, useState } from 'react';
import { ImageIcon } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type ImagePreviewProps = {
  src?: string | null;
  alt?: string;
  className?: string;
  placeholder?: string;
};

export function ImagePreview({
  src,
  alt = 'Image preview',
  className,
  placeholder = 'No image selected',
}: ImagePreviewProps) {
  const [failed, setFailed] = useState(false);
  const trimmed = src?.trim();

  useEffect(() => {
    setFailed(false);
  }, [trimmed]);

  if (!trimmed || failed) {
    return (
      <div
        className={cn(
          'bg-muted/30 flex aspect-[4/3] max-h-48 items-center justify-center overflow-hidden rounded-lg border',
          className,
        )}
      >
        <div className="text-muted-foreground flex flex-col items-center gap-2 px-4 text-center text-sm">
          <ImageIcon className="size-8 shrink-0" />
          <span>{failed ? 'Unable to load image' : placeholder}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-muted/30 aspect-[4/3] max-h-48 overflow-hidden rounded-lg border',
        className,
      )}
    >
      <img
        src={trimmed}
        alt={alt}
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

type ImageFilePickerProps = {
  id?: string;
  file: File | null;
  existingUrl?: string | null;
  onFileChange: (file: File | null) => void;
  accept?: string;
  helperText?: string;
  previewAlt?: string;
  className?: string;
};

export function ImageFilePicker({
  id,
  file,
  existingUrl,
  onFileChange,
  accept = 'image/*',
  helperText,
  previewAlt,
  className,
}: ImageFilePickerProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const previewSrc = objectUrl ?? existingUrl ?? null;

  return (
    <div className={cn('space-y-2', className)}>
      <Input
        id={id}
        type="file"
        accept={accept}
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
      />
      {file ? (
        <p className="text-muted-foreground text-xs">
          Selected: {file.name}
        </p>
      ) : null}
      <ImagePreview src={previewSrc} alt={previewAlt} />
      {helperText ? (
        <p className="text-muted-foreground text-xs">{helperText}</p>
      ) : null}
    </div>
  );
}
