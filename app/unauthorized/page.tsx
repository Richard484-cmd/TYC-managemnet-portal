import { Button } from '@/components/ui/button';
import { ShieldX } from 'lucide-react';
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <ShieldX className="h-8 w-8 text-destructive" />
      </div>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="mt-2 text-muted-foreground">
          You do not have permission to view this page.
        </p>
      </div>
      <Link href="/">
        <Button variant="outline">Return Home</Button>
      </Link>
    </div>
  );
}
