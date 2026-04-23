import { Button } from '@mantine/core';
import { IconCheck, IconTransfer } from '@tabler/icons-react';
import { ref, update } from 'firebase/database';
import { database } from '../../firebase/config';
import { formatTimestamp, formatCurrency } from '../../utils/formatUtils';

export default function SettlementItem({ expense, expenseId, sharingId, participants }) {
  const debtor = participants[expense.debtorId];
  const creditor = participants[expense.creditorId];
  const user1 = participants[expense.user1Id];
  const user2 = participants[expense.user2Id];

  async function handleTransferred() {
    await update(ref(database, `sharings/${sharingId}/expenses/${expenseId}`), {
      transferred: true,
    });
  }

  return (
    <div className={`settlement-item${expense.transferred ? ' settlement-item--transferred' : ''}`}>
      <p className="settlement-item__title">
        <IconTransfer size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
        {expense.description}
      </p>

      <div className="settlement-item__amounts">
        {user1 && (
          <div className="settlement-item__amount-entry">
            {user1.name}: <span>{formatCurrency(expense.user1Amount, expense.currency)}</span>
          </div>
        )}
        {user2 && (
          <div className="settlement-item__amount-entry">
            {user2.name}: <span>{formatCurrency(expense.user2Amount, expense.currency)}</span>
          </div>
        )}
      </div>

      <div className="settlement-item__footer">
        <span className="settlement-item__timestamp">
          {formatTimestamp(expense.timestamp)}
        </span>

        {expense.transferred ? (
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
            onClick={handleTransferred}
            leftSection={<IconCheck size={14} />}
          >
            Overført
          </Button>
        )}
      </div>
    </div>
  );
}
