'use client';

import { cn } from '@/lib/utils';
import { LoadingTable } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { Inbox } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  rowKey?: (row: T) => string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  loading,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items to display.',
  onRowClick,
  rowKey,
  className,
}: DataTableProps<T>) {
  if (loading) {
    return <LoadingTable rows={5} cols={columns.length} />;
  }

  if (data.length === 0) {
    return <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={cn('overflow-x-auto rounded-md border', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left font-medium text-muted-foreground',
                  col.headerClassName
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={rowKey ? rowKey(row) : i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-b transition-colors hover:bg-muted/50',
                onRowClick && 'cursor-pointer'
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn('px-4 py-3', col.className)}>
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
