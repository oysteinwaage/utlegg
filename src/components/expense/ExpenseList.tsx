import ExpenseItem from './ExpenseItem';
import SettlementItem from './SettlementItem';
import type { AnyEntry, ExpenseRecord, SettlementRecord, UserProfile } from '../../types';

interface ExpenseListProps {
  expenses: Record<string, AnyEntry> | undefined;
  sharingId: string;
  participants: Record<string, UserProfile>;
  participantIds: string[];
  defaultCurrency: string;
  currentUserId: string;
  isAdmin: boolean;
  lastSettlementAt: number;
}

export default function ExpenseList({
  expenses, sharingId, participants, participantIds, defaultCurrency, currentUserId, isAdmin, lastSettlementAt,
}: ExpenseListProps) {
  if (!expenses || Object.keys(expenses).length === 0) {
    return (
      <div className="expense-list">
        <h3 className="expense-list__header">Utlegg</h3>
        <div className="expense-list__empty">Ingen utlegg ennå. Legg til det første!</div>
      </div>
    );
  }

  const sorted = Object.entries(expenses).sort(([, a], [, b]) => b.timestamp - a.timestamp);

  return (
    <div className="expense-list">
      <h3 className="expense-list__header">
        Utlegg
        <span className="expense-list__count">{sorted.length} poster</span>
      </h3>

      {sorted.map(([id, entry]) => {
        if (entry.type === 'settlement') {
          const enriched: SettlementRecord & { defaultCurrency: string } = {
            ...(entry as SettlementRecord),
            defaultCurrency,
          };
          return (
            <SettlementItem
              key={id}
              expenseId={id}
              expense={enriched}
              sharingId={sharingId}
              participants={participants}
            />
          );
        }

        const enriched: ExpenseRecord & { defaultCurrency: string } = {
          ...(entry as ExpenseRecord),
          defaultCurrency,
        };
        return (
          <ExpenseItem
            key={id}
            expense={enriched}
            expenseId={id}
            sharingId={sharingId}
            participants={participants}
            participantIds={participantIds}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            lastSettlementAt={lastSettlementAt}
          />
        );
      })}
    </div>
  );
}
