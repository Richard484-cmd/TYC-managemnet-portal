export function toCSV(rows: Record<string, unknown>[], headers?: { key: string; label: string }[]): string {
  if (rows.length === 0 && !headers) return '';
  const cols = headers ?? Object.keys(rows[0] ?? {}).map((k) => ({ key: k, label: k }));
  const headerLine = cols.map((c) => `"${c.label}"`).join(',');
  const dataLines = rows.map((row) =>
    cols
      .map((c) => {
        const val = row[c.key];
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}
