'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toCSV } from '@/lib/reports/csv';

interface CSVExportButtonProps {
  rows: Record<string, unknown>[];
  headers?: { key: string; label: string }[];
  filename: string;
  disabled?: boolean;
}

export function CSVExportButton({ rows, headers, filename, disabled }: CSVExportButtonProps) {
  const handleExport = () => {
    const csv = toCSV(rows, headers);
    if (!csv) return;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={disabled || rows.length === 0}>
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  );
}
