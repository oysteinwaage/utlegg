import { Button } from '@mantine/core';
import { IconCheck, IconTransfer, IconArrowRight } from '@tabler/icons-react';
import { ref, update } from 'firebase/database';
import { database } from '../../firebase/config';
import { formatTimestamp, formatCurrency } from '../../utils/formatUtils';
import type { SettlementRecord, SettlementTransaction, UserProfile } from '../../types';

interface SettlementItemProps {
  expense: SettlementRecord & { defaultCurrency?: string };
  expenseId: string;
  sharingId: string;
  participants: Record<string, UserProfile>;
}

// Normaliser både nytt (totals/transactions) og gammelt (user1*/user2*/debtor*) format.
function normalize(expense: SettlementRecord): {
  totals: Record<string, number>;
  transactions: SettlementTransaction[];
  legacy: boolean;
} {
  if (expense.transactions || expense.totals) {
    return {
      totals: expense.totals ?? {},
      transactions: expense.transactions ?? [],
      legacy: false,
    };
  }

  // Gammelt 2-personers format
  const totals: Record<string, number> = {};
  if (expense.user1Id) totals[expense.user1Id] = expense.user1Amount ?? 0;
  if (expense.user2Id) totals[expense.user2Id] = expense.user2Amount ?? 0;

  const transactions: SettlementTransaction[] = [];
  if (expense.debtorId && expense.creditorId && (expense.debtAmount ?? 0) > 0) {
    transactions.push({
      debtorId: expense.debtorId,
      creditorId: expense.creditorId,
      amount: expense.debtAmount ?? 0,
      transferred: expense.transferred ?? false,
    });
  }

  return { totals, transactions, legacy: true };
}

export default function SettlementItem({ expense, expenseId, sharingId, participants }: SettlementItemProps) {
  const { totals, transactions, legacy } = normalize(expense);
  const allTransferred = transactions.length > 0 && transactions.every((t) => t.transferred);

  async function handleTransferred(index: number) {
    if (legacy) {
      // Gamle poster lagrer ett enkelt 'transferred'-flagg på toppnivå.
      await update(ref(database, `sharings/${sharingId}/expenses/${expenseId}`), {
        transferred: true,
      });
    } else {
      await update(ref(database, `sharings/${sharingId}/expenses/${expenseId}/transactions/${index}`), {
        transferred: true,
      });
    }
  }

  return (
    <div className={`settlement-item${allTransferred ? ' settlement-item--transferred' : ''}`}>
      <p className="settlement-item__title">
        <IconTransfer size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
        {expense.description}
      </p>

      <div className="settlement-item__amounts">
        {Object.entries(totals).map(([uid, amount]) => {
          const profile = participants[uid];
          if (!profile) return null;
          return (
            <div key={uid} className="settlement-item__amount-entry">
              {profile.name}: <span>{formatCurrency(amount, expense.currency)}</span>
            </div>
          );
        })}
      </div>

      {transactions.length > 0 && (
        <div className="settlement-item__transactions">
          {transactions.map((txn, idx) => {
            const debtor   = participants[txn.debtorId];
            const creditor = participants[txn.creditorId];
            return (
              <div key={idx} className="settlement-item__transaction">
                <span className="settlement-item__transaction-text">
                  {debtor?.name ?? 'Ukjent'}
                  <IconArrowRight size={14} style={{ verticalAlign: 'middle', margin: '0 4px' }} />
                  {creditor?.name ?? 'Ukjent'}: <span>{formatCurrency(txn.amount, expense.currency)}</span>
                </span>
                {txn.transferred ? (
                  <span className="settlement-item__status-label">
                    <IconCheck size={14} />
                    Oppgjør ferdig
                  </span>
                ) : (
                  <Button
                    size="xs"
                    variant="filled"
                    color="violet"
                    radius="md"
                    onClick={() => handleTransferred(idx)}
                    leftSection={<IconCheck size={14} />}
                  >
                    Overført
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="settlement-item__footer">
        <span className="settlement-item__timestamp">
          {formatTimestamp(expense.timestamp)}
        </span>
      </div>
    </div>
  );
}
