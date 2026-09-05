import { useRef, useState } from 'react';
import { Modal, Button, Text, Stack, Alert, Checkbox, ScrollArea, Select, Group } from '@mantine/core';
import { IconAlertCircle, IconFileSpreadsheet, IconUpload } from '@tabler/icons-react';
import { parseTransactionsFile, type ParsedTransaction } from '../../utils/importTransactions';
import { formatCurrency, formatTimestamp } from '../../utils/formatUtils';
import { CATEGORIES, getCategoryIcon } from '../../utils/categoryUtils';
import type { ExpenseCategory } from '../../types';

export interface ImportedExpense {
  description: string;
  amount: number;
  currency: string;
  timestamp: number;
  category?: ExpenseCategory;
}

interface ImportTransactionsModalProps {
  opened: boolean;
  onClose: () => void;
  onImport: (entries: ImportedExpense[]) => Promise<void>;
}

export default function ImportTransactionsModal({ opened, onClose, onImport }: ImportTransactionsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, ExpenseCategory | null>>({});
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setTransactions([]);
    setSelected({});
    setCategoryOverrides({});
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setError('');
    try {
      const parsed = await parseTransactionsFile(file);
      setTransactions(parsed);
      const initialSelected: Record<string, boolean> = {};
      parsed.forEach((t) => { initialSelected[t.key] = false; });
      setSelected(initialSelected);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke lese filen.');
    } finally {
      setParsing(false);
    }
  }

  function toggle(key: string) {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function selectAll(value: boolean) {
    const next: Record<string, boolean> = {};
    transactions.forEach((t) => { next[t.key] = value; });
    setSelected(next);
  }

  function categoryFor(t: ParsedTransaction): ExpenseCategory | undefined {
    const override = categoryOverrides[t.key];
    return override !== undefined ? (override ?? undefined) : t.category;
  }

  const selectedCount = transactions.filter((t) => selected[t.key]).length;

  async function handleImport() {
    const entries: ImportedExpense[] = transactions
      .filter((t) => selected[t.key])
      .map((t) => ({
        description: t.description,
        amount: t.amount,
        currency: t.currency,
        timestamp: t.date,
        category: categoryFor(t),
      }));
    if (entries.length === 0) return;
    setImporting(true);
    setError('');
    try {
      await onImport(entries);
      handleClose();
    } catch {
      setError('Import feilet. Prøv igjen.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Importer fra DNB"
      size="lg"
      radius="md"
      styles={{
        inner: { alignItems: 'stretch' },
        content: { height: '100%', display: 'flex', flexDirection: 'column' },
        body: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
      }}
    >
      <Stack gap="md" style={{ flex: 1, minHeight: 0 }}>
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" radius="md">{error}</Alert>
        )}

        {transactions.length === 0 ? (
          <div className="import-transactions__dropzone" style={{ flex: 1 }}>
            <IconFileSpreadsheet size={32} />
            <Text size="sm" c="dimmed" ta="center">
              Velg en Excel-fil med transaksjoner fra kortutskriften din.
              Forventede kolonner: Dato, Beløpet gjelder og Ut.
            </Text>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <Button
              leftSection={<IconUpload size={16} />}
              radius="md"
              color="violet"
              loading={parsing}
              onClick={() => fileInputRef.current?.click()}
            >
              Velg fil
            </Button>
          </div>
        ) : (
          <>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">{selectedCount} av {transactions.length} valgt</Text>
              <Group gap="xs">
                <Button variant="subtle" size="xs" radius="md" onClick={() => selectAll(true)}>Velg alle</Button>
                <Button variant="subtle" size="xs" radius="md" onClick={() => selectAll(false)}>Velg ingen</Button>
              </Group>
            </Group>

            <ScrollArea style={{ flex: 1, minHeight: 0 }} type="auto">
              <div className="import-transactions__list">
                {transactions.map((t) => {
                  const category = categoryFor(t);
                  const CategoryIcon = getCategoryIcon(category);
                  return (
                    <div key={t.key} className="import-transactions__row">
                      <div
                        className="import-transactions__toggle-area"
                        onClick={() => toggle(t.key)}
                      >
                        <Checkbox
                          checked={selected[t.key]}
                          onChange={() => toggle(t.key)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="import-transactions__info">
                          <div className="import-transactions__desc">
                            {t.description || 'Uten beskrivelse'}
                          </div>
                          <div className="import-transactions__meta">{formatTimestamp(t.date)}</div>
                        </div>
                        <div className="import-transactions__amount">
                          {formatCurrency(t.amount, t.currency)}
                        </div>
                      </div>
                      <Select
                        className="import-transactions__category"
                        size="xs"
                        placeholder="Kategori"
                        data={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
                        value={category ?? null}
                        onChange={(val) => setCategoryOverrides((prev) => ({ ...prev, [t.key]: val as ExpenseCategory | null }))}
                        leftSection={<CategoryIcon size={14} />}
                        clearable
                        radius="md"
                        w={190}
                      />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <Button
              onClick={handleImport}
              loading={importing}
              disabled={selectedCount === 0}
              radius="md"
              color="violet"
              fullWidth
            >
              Importer {selectedCount} utlegg
            </Button>
            <Button variant="subtle" radius="md" onClick={handleClose}>
              Avbryt
            </Button>
          </>
        )}
      </Stack>
    </Modal>
  );
}
