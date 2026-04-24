import { useState } from 'react';
import { ActionIcon } from '@mantine/core';
import { IconReceipt, IconPencil } from '@tabler/icons-react';
import { formatTimestamp, formatCurrency } from '../../utils/formatUtils';
import EditExpenseModal from './EditExpenseModal';

export default function ExpenseItem({
  expense, expenseId, sharingId, participants, currentUserId, isAdmin, lastSettlementAt,
}) {
  const [editOpen, setEditOpen] = useState(false);
  const payer = participants[expense.paidBy];
  const payerName = payer?.name || 'Ukjent';
  const showOriginal = expense.currency !== expense.defaultCurrency && expense.currency;
  const afterSettlement = !lastSettlementAt || expense.timestamp > lastSettlementAt;
  const canEdit = afterSettlement && (expense.paidBy === currentUserId || isAdmin);

  return (
    <>
      <div className="expense-item">
        <div className="expense-item__icon">
          <IconReceipt size={20} />
        </div>

        <div className="expense-item__body">
          <p className="expense-item__description">{expense.description}</p>
          <div className="expense-item__meta">
            <span className="expense-item__payer">
              <span className="expense-item__payer-dot" />
              {payerName}
            </span>
            <span>·</span>
            <span>{formatTimestamp(expense.timestamp)}</span>
          </div>
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

      {canEdit && (
        <EditExpenseModal
          opened={editOpen}
          onClose={() => setEditOpen(false)}
          expense={expense}
          expenseId={expenseId}
          sharingId={sharingId}
          defaultCurrency={expense.defaultCurrency}
        />
      )}
    </>
  );
}
