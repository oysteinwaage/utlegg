import { useState, useEffect } from 'react';
import {
  Modal, Button, TextInput, NumberInput, Select, Stack, Alert, Loader, Text, Group,
} from '@mantine/core';
import { IconAlertCircle, IconArrowRight } from '@tabler/icons-react';
import { CURRENCIES, getExchangeRate } from '../../services/currencyService';
import { formatCurrency } from '../../utils/formatUtils';

export default function AddExpenseModal({ opened, onClose, onSubmit, defaultCurrency = 'NOK' }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [exchangeRate, setExchangeRate] = useState(1);
  const [loadingRate, setLoadingRate] = useState(false);
  const [rateError, setRateError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset currency when modal opens
  useEffect(() => {
    if (opened) {
      setCurrency(defaultCurrency);
      setExchangeRate(1);
      setAmount('');
      setDescription('');
      setError('');
      setRateError('');
    }
  }, [opened, defaultCurrency]);

  // Fetch exchange rate when currency changes away from default
  useEffect(() => {
    if (!opened) return;
    if (currency === defaultCurrency) {
      setExchangeRate(1);
      setRateError('');
      return;
    }

    setLoadingRate(true);
    setRateError('');

    getExchangeRate(currency, defaultCurrency)
      .then((rate) => setExchangeRate(rate))
      .catch(() => setRateError('Kunne ikke hente valutakurs. Konvertert beløp er estimert.'))
      .finally(() => setLoadingRate(false));
  }, [currency, defaultCurrency, opened]);

  function handleClose() {
    setDescription('');
    setAmount('');
    setCurrency(defaultCurrency);
    setExchangeRate(1);
    setError('');
    onClose();
  }

  async function handleSubmit() {
    if (!description.trim()) return setError('Beskrivelse er påkrevd.');
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return setError('Beløp må være større enn 0.');

    setSubmitting(true);
    setError('');

    try {
      await onSubmit({
        description: description.trim(),
        amount: numAmount,
        currency,
        amountInDefault: Math.round(numAmount * exchangeRate * 100) / 100,
      });
      handleClose();
    } catch {
      setError('Noe gikk galt. Prøv igjen.');
    } finally {
      setSubmitting(false);
    }
  }

  const currencyOptions = CURRENCIES.map((c) => ({ value: c.value, label: c.value }));
  const amountNum = parseFloat(amount) || 0;
  const convertedAmount = amountNum * exchangeRate;

  return (
    <Modal opened={opened} onClose={handleClose} title="Legg til utlegg" size="md" radius="md">
      <Stack gap="md">
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" radius="md">
            {error}
          </Alert>
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
          />
          <Select
            label="Valuta"
            data={currencyOptions}
            value={currency}
            onChange={setCurrency}
            radius="md"
            w={120}
          />
        </Group>

        {currency !== defaultCurrency && (
          <div className="modal-exchange-rate">
            {loadingRate ? (
              <>
                <Loader size="xs" />
                <span>Henter kurs…</span>
              </>
            ) : rateError ? (
              <Text size="xs" c="red">{rateError}</Text>
            ) : (
              <>
                <span>1 {currency} = {exchangeRate.toFixed(4)} {defaultCurrency}</span>
                {amountNum > 0 && (
                  <>
                    <IconArrowRight size={12} />
                    <strong>{formatCurrency(convertedAmount, defaultCurrency)}</strong>
                  </>
                )}
              </>
            )}
          </div>
        )}

        <Text size="xs" c="dimmed">
          Utlegget registreres på deg. Beløpet lagres i {currency}
          {currency !== defaultCurrency ? ` og konvertert til ${defaultCurrency}` : ''}.
        </Text>

        <Button
          onClick={handleSubmit}
          loading={submitting}
          radius="md"
          color="violet"
          fullWidth
          mt="xs"
          disabled={loadingRate}
        >
          Legg til utlegg
        </Button>
      </Stack>
    </Modal>
  );
}
