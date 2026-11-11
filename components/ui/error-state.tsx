import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  action?: React.ReactNode;
  className?: string;
}

export function ErrorState({ title = 'Something went wrong', message, action, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold">{title}</h3>
        {message && <p className="text-sm text-muted-foreground max-w-sm">{message}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
