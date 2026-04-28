import { useState } from 'react';
import { ActionIcon } from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';
import { formatTimestamp, formatCurrency } from '../../utils/formatUtils';
import { getCategoryIcon } from '../../utils/categoryUtils';
import EditExpenseModal from './EditExpenseModal';
import type { ExpenseRecord, UserProfile } from '../../types';

type EnrichedExpense = ExpenseRecord & { defaultCurrency: string };

interface ExpenseItemProps {
  expense: EnrichedExpense;
  expenseId: string;
  sharingId: string;
  participants: Record<string, UserProfile>;
  participantIds: string[];
  currentUserId: string;
  isAdmin: boolean;
  lastSettlementAt: number;
}

export default function ExpenseItem({
  expense, expenseId, sharingId, participants, participantIds, currentUserId, isAdmin, lastSettlementAt,
}: ExpenseItemProps) {
  const [editOpen, setEditOpen] = useState(false);
  const payer      = participants[expense.paidBy];
  const payerName  = (() => {
    const name = payer?.name;
    if (!name) return 'Ukjent';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  })();
  const showOriginal  = expense.currency !== expense.defaultCurrency && expense.currency;
  const afterSettlement = !lastSettlementAt || expense.timestamp > lastSettlementAt;
  const canEdit       = afterSettlement && (expense.paidBy === currentUserId || isAdmin);
  const CategoryIcon  = getCategoryIcon(expense.category);

  const splitLabel = (() => {
    const among = expense.splitAmong;
    if (!among || among.length === 0) return 'Deles likt';
    if (among.length === 1) {
      const firstName = (participants[among[0]]?.name ?? 'Ukjent').split(' ')[0];
      return `Kun ${firstName}`;
    }
    const firstNames = among.map((uid) => (participants[uid]?.name ?? 'Ukjent').split(' ')[0]);
    return `Deles mellom ${firstNames.join(', ')}`;
  })();

  return (
    <>
      <div className="expense-item">
        <div className="expense-item__icon">
          <span className="expense-item__icon-badge">
            <CategoryIcon size={20} />
          </span>
        </div>

        <div className="expense-item__content">
          <p className="expense-item__description">{expense.description}</p>

          <div className="expense-item__row">
            <div className="expense-item__body">
              <div className="expense-item__meta">
                <span className="expense-item__payer">
                  <span className="expense-item__payer-dot" />
                  {payerName}
                </span>
                <span>·</span>
                <span>{formatTimestamp(expense.timestamp)}</span>
              </div>
              <div className="expense-item__split-label">{splitLabel}</div>
            </div>

            <div className="expense-item__amount">
              {formatCurrency(expense.amountInDefault, expense.defaultCurrency)}
              {showOriginal && (
                <span className="expense-item__amount__original">
                  {formatCurrency(expense.amount, expense.currency)}
                </span>
              )}
            </div>

            {canEdit && (
              <ActionIcon
                className="expense-item__edit-btn"
                size={24}
                variant="subtle"
                color="gray"
                radius="sm"
                aria-label="Rediger utlegg"
                onClick={() => setEditOpen(true)}
              >
                <IconPencil size={14} />
              </ActionIcon>
            )}
          </div>
        </div>
      </div>

      {canEdit && (
        <EditExpenseModal
          opened={editOpen}
          onClose={() => setEditOpen(false)}
          expense={expense}
          expenseId={expenseId}
          sharingId={sharingId}
          defaultCurrency={expense.defaultCurrency ?? 'NOK'}
          participants={participants}
          participantIds={participantIds}
        />
      )}
    </>
  );
}
