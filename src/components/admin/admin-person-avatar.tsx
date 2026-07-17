import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type AdminPersonAvatarProps = {
  name?: string | null;
  avatarUrl?: string | null;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
};

function initialsFromName(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
}

/**
 * Compact person avatar for admin tables and docks.
 * Falls back to initials when no image is available.
 */
export function AdminPersonAvatar({
  name,
  avatarUrl,
  size = 'sm',
  className,
}: AdminPersonAvatarProps) {
  return (
    <Avatar size={size} className={cn(className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name?.trim() || 'User'} /> : null}
      <AvatarFallback className="bg-muted text-muted-foreground font-medium">
        {initialsFromName(name)}
      </AvatarFallback>
    </Avatar>
  );
}
