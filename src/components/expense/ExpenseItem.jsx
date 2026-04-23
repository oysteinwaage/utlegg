import { IconReceipt } from '@tabler/icons-react';
import { formatTimestamp, formatCurrency } from '../../utils/formatUtils';

export default function ExpenseItem({ expense, participants }) {
  const payer = participants[expense.paidBy];
  const payerName = payer?.name || 'Ukjent';
  const showOriginal = expense.currency !== expense.defaultCurrency && expense.currency;

  return (
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
    </div>
  );
}
