import Link from 'next/link';
import { ArrowLeft, Home, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7faff] px-4 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-[#c9d9ec] bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eef5ff] text-[#1764c0]">
          <SearchX className="h-7 w-7" />
        </div>
        <p className="mt-6 text-5xl font-bold tracking-tight text-[#0b2340]">404</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#0b2340]">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-[#45617e]">
          The page you are looking for may have moved or is not available.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go home
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Contact the church
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
