import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import {
  IconAlertOctagon,
  IconAlertTriangle,
  IconCircleCheck,
  IconInfoCircle,
  IconLoader,
} from '@tabler/icons-react';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      closeButton
      icons={{
        success: <IconCircleCheck className="size-4 text-emerald-600" />,
        info: <IconInfoCircle className="size-4 text-primary" />,
        warning: <IconAlertTriangle className="size-4 text-amber-600" />,
        error: <IconAlertOctagon className="size-4 text-destructive" />,
        loading: <IconLoader className="size-4 animate-spin text-muted-foreground" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            'group toast cn-toast border border-border bg-card text-card-foreground shadow-md',
          title: 'text-sm font-semibold',
          description: 'text-muted-foreground text-sm',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground',
          closeButton:
            'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
