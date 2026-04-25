import { useState, useEffect } from 'react';
import {
  Modal, Button, TextInput, NumberInput, Select, Stack, Alert, Loader, Text, Group, Switch, Divider,
} from '@mantine/core';
import { IconAlertCircle, IconArrowRight, IconTrash } from '@tabler/icons-react';
import { ref, update, remove } from 'firebase/database';
import { database } from '../../firebase/config';
import { CURRENCIES, getExchangeRate } from '../../services/currencyService';
import { formatCurrency } from '../../utils/formatUtils';
import type { ExpenseRecord, UserProfile } from '../../types';

interface EditExpenseModalProps {
  opened: boolean;
  onClose: () => void;
  expense: ExpenseRecord & { defaultCurrency?: string };
  expenseId: string;
  sharingId: string;
  defaultCurrency: string;
  participants: Record<string, UserProfile>;
  participantIds: string[];
}

export default function EditExpenseModal({
  opened, onClose, expense, expenseId, sharingId, defaultCurrency,
  participants, participantIds,
}: EditExpenseModalProps) {
  const [description, setDescription]     = useState('');
  const [amount, setAmount]               = useState<number | string>('');
  const [currency, setCurrency]           = useState(defaultCurrency);
  const [exchangeRate, setExchangeRate]   = useState(1);
  const [loadingRate, setLoadingRate]     = useState(false);
  const [rateError, setRateError]         = useState('');
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [splitEqually, setSplitEqually]   = useState(true);
  const [selectedIds, setSelectedIds]     = useState<string[]>([]);

  useEffect(() => {
    if (opened && expense) {
      setDescription(expense.description ?? '');
      setAmount(expense.amount ?? '');
      setCurrency(expense.currency ?? defaultCurrency);
      setError('');
      setRateError('');
      setDeleteConfirm(false);
      const hasCustomSplit = expense.splitAmong && expense.splitAmong.length > 0;
      setSplitEqually(!hasCustomSplit);
      setSelectedIds(hasCustomSplit ? expense.splitAmong! : [...participantIds]);
    }
  }, [opened, expense, defaultCurrency]);

  useEffect(() => {
    if (!opened) return;
    if (currency === defaultCurrency) { setExchangeRate(1); setRateError(''); return; }
    setLoadingRate(true);
    setRateError('');
    getExchangeRate(currency, defaultCurrency)
      .then((rate) => setExchangeRate(rate))
      .catch(() => setRateError('Kunne ikke hente valutakurs. Konvertert beløp er estimert.'))
      .finally(() => setLoadingRate(false));
  }, [currency, defaultCurrency, opened]);

  function handleClose() {
    setError('');
    setDeleteConfirm(false);
    onClose();
  }

  function toggleParticipant(uid: string) {
    setSelectedIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );
  }

  async function handleSave() {
    if (!description.trim()) return setError('Beskrivelse er påkrevd.');
    const numAmount = parseFloat(String(amount));
    if (!numAmount || numAmount <= 0) return setError('Beløp må være større enn 0.');
    if (!splitEqually && selectedIds.length === 0) return setError('Minst én deltaker må være med i splittingen.');

    setSubmitting(true);
    setError('');
    try {
      await update(ref(database, `sharings/${sharingId}/expenses/${expenseId}`), {
        description: description.trim(),
        amount: numAmount,
        currency,
        amountInDefault: Math.round(numAmount * exchangeRate * 100) / 100,
        splitAmong: splitEqually ? null : selectedIds,
      });
      handleClose();
    } catch {
      setError('Noe gikk galt. Prøv igjen.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await remove(ref(database, `sharings/${sharingId}/expenses/${expenseId}`));
      handleClose();
    } catch {
      setError('Kunne ikke slette utlegget. Prøv igjen.');
      setDeleting(false);
    }
  }

  const currencyOptions = CURRENCIES.map((c) => ({ value: c.value, label: c.value }));
  const amountNum       = parseFloat(String(amount)) || 0;
  const convertedAmount = amountNum * exchangeRate;

  return (
    <Modal opened={opened} onClose={handleClose} title="Rediger utlegg" size="md" radius="md">
      <Stack gap="md">
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" radius="md">{error}</Alert>
        )}

        <TextInput
          label="Beskrivelse"
          placeholder="F.eks. Middag på restaurant"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          radius="md"
          required
          autoFocus
        />

        <Group grow align="flex-start">
          <NumberInput
            label="Beløp"
            placeholder="0.00"
            value={amount}
            onChange={setAmount}
            min={0}
            step={10}
            decimalScale={2}
            radius="md"
            required
            inputMode="decimal"
          />
          <Select
            label="Valuta"
            data={currencyOptions}
            value={currency}
            onChange={(val) => { if (val) setCurrency(val); }}
            radius="md"
            w={120}
          />
        </Group>

        {currency !== defaultCurrency && (
          <div className="modal-exchange-rate">
            {loadingRate ? (
              <><Loader size="xs" /><span>Henter kurs…</span></>
            ) : rateError ? (
              <Text size="xs" c="red">{rateError}</Text>
            ) : (
              <>
                <span>1 {currency} = {exchangeRate.toFixed(4)} {defaultCurrency}</span>
                {amountNum > 0 && (
                  <><IconArrowRight size={12} /><strong>{formatCurrency(convertedAmount, defaultCurrency)}</strong></>
                )}
              </>
            )}
          </div>
        )}

        <Divider />

        <div className="expense-split">
          <Switch
            label="Deles likt"
            checked={splitEqually}
            onChange={(e) => {
              setSplitEqually(e.currentTarget.checked);
              if (e.currentTarget.checked) setSelectedIds([...participantIds]);
            }}
          />
          {!splitEqually && (
            <div className="expense-split__participants">
              {participantIds.map((uid) => (
                <div key={uid} className="expense-split__participant">
                  <Switch
                    label={participants[uid]?.name ?? 'Ukjent'}
                    checked={selectedIds.includes(uid)}
                    onChange={() => toggleParticipant(uid)}
                  />
                </div>
              ))}
              {selectedIds.length === 0 && (
                <Text size="xs" c="red">Minst én deltaker må velges.</Text>
              )}
            </div>
          )}
        </div>

        <Button
          onClick={handleSave}
          loading={submitting}
          radius="md"
          color="violet"
          fullWidth
          disabled={loadingRate}
        >
          Lagre endringer
        </Button>

        {!deleteConfirm ? (
          <Button
            variant="subtle"
            color="red"
            radius="md"
            fullWidth
            leftSection={<IconTrash size={16} />}
            onClick={() => setDeleteConfirm(true)}
          >
            Slett utlegg
          </Button>
        ) : (
          <Stack gap="xs">
            <Text size="sm" c="dimmed" ta="center">
              Er du sikker på at du vil slette dette utlegget?
            </Text>
            <Group grow>
              <Button color="red" radius="md" loading={deleting} onClick={handleDelete}>
                Ja, slett
              </Button>
              <Button variant="subtle" radius="md" onClick={() => setDeleteConfirm(false)}>
                Avbryt
              </Button>
            </Group>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
