import ExpenseItem from './ExpenseItem';
import SettlementItem from './SettlementItem';

export default function ExpenseList({ expenses, sharingId, participants, defaultCurrency }) {
  if (!expenses || Object.keys(expenses).length === 0) {
    return (
      <div className="expense-list">
        <h3 className="expense-list__header">Utlegg</h3>
        <div className="expense-list__empty">Ingen utlegg ennå. Legg til det første!</div>
      </div>
    );
  }

  // Sort by timestamp descending (newest first)
  const sorted = Object.entries(expenses).sort(([, a], [, b]) => b.timestamp - a.timestamp);

  return (
    <div className="expense-list">
      <h3 className="expense-list__header">
        Utlegg
        <span className="expense-list__count">{sorted.length} poster</span>
      </h3>

      {sorted.map(([id, expense]) => {
        const enriched = { ...expense, defaultCurrency };

        if (expense.type === 'settlement') {
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

        return (
          <ExpenseItem key={id} expense={enriched} participants={participants} />
        );
      })}
    </div>
  );
}
