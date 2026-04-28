import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Center, Loader, SegmentedControl, Select, Group, Progress } from '@mantine/core';
import { IconArrowLeft, IconReceipt } from '@tabler/icons-react';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/AppLayout';
import { CATEGORIES } from '../utils/categoryUtils';
import { formatCurrency } from '../utils/formatUtils';
import type { Sharing, ExpenseRecord } from '../types';

const MONTHS = [
  'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Desember',
];

export default function BudgetPage() {
  const { id } = useParams<{ id: string }>();
  const { currentUserId } = useAuth();
  const navigate = useNavigate();
  const [sharing, setSharing] = useState<Sharing | null>(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  useEffect(() => {
    if (!id) return;
    const unsub = onValue(ref(database, `sharings/${id}`), (snap) => {
      if (!snap.exists()) { navigate('/overview'); return; }
      const data = snap.val();
      if (!data.participants?.[currentUserId]) { navigate('/overview'); return; }
      setSharing({ id: snap.key!, ...data });
      setLoading(false);
    });
    return () => unsub();
  }, [id, currentUserId, navigate]);

  const availableYears = useMemo(() => {
    const years = new Set([now.getFullYear()]);
    if (sharing?.expenses) {
      Object.values(sharing.expenses)
        .filter((e): e is ExpenseRecord => e.type === 'expense')
        .forEach((e) => years.add(new Date(e.timestamp).getFullYear()));
    }
    return [...years].sort((a, b) => b - a);
  }, [sharing?.expenses]);

  const categoryTotals = useMemo<Record<string, number>>(() => {
    if (!sharing?.expenses) return {} as Record<string, number>;
    return Object.values(sharing.expenses)
      .filter((e): e is ExpenseRecord => e.type === 'expense')
      .filter((e) => {
        const d = new Date(e.timestamp);
        if (mode === 'year') return d.getFullYear() === selectedYear;
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
      })
      .reduce<Record<string, number>>((acc, e) => {
        const key = e.category ?? '__none__';
        acc[key] = (acc[key] ?? 0) + e.amountInDefault;
        return acc;
      }, {});
  }, [sharing?.expenses, mode, selectedMonth, selectedYear]);

  const grandTotal = Object.values(categoryTotals).reduce((s, v) => s + v, 0);

  const rows = useMemo(() => {
    const defined = CATEGORIES
      .filter((c) => c.value in categoryTotals)
      .map((c) => ({ key: c.value as string, label: c.label, Icon: c.Icon, amount: Number(categoryTotals[c.value]) }));

    const result = [...defined];
    if ('__none__' in categoryTotals) {
      result.push({ key: '__none__', label: 'Ukategorisert', Icon: IconReceipt, amount: Number(categoryTotals['__none__']) });
    }
    return result.sort((a, b) => b.amount - a.amount);
  }, [categoryTotals]);

  if (loading) {
    return <AppLayout><Center h={400}><Loader color="violet" /></Center></AppLayout>;
  }

  const currency = sharing!.defaultCurrency;

  return (
    <AppLayout>
      <div className="budget-page">
        <div className="budget-page__header">
          <Link to={`/sharing/${id}`} className="sharing-page__back-link">
            <IconArrowLeft size={14} />
            Tilbake til {sharing!.name}
          </Link>
          <h1 className="budget-page__title">Budsjett</h1>
          <p className="budget-page__subtitle">{sharing!.name}</p>
        </div>

        <div className="budget-page__controls">
          <SegmentedControl
            value={mode}
            onChange={(v) => setMode(v as 'month' | 'year')}
            data={[
              { label: 'Måned', value: 'month' },
              { label: 'År', value: 'year' },
            ]}
            color="violet"
            radius="md"
          />
          <Group gap="sm">
            {mode === 'month' && (
              <Select
                data={MONTHS.map((m, i) => ({ value: String(i), label: m }))}
                value={String(selectedMonth)}
                onChange={(v) => { if (v !== null) setSelectedMonth(Number(v)); }}
                radius="md"
                w={140}
              />
            )}
            <Select
              data={availableYears.map((y) => ({ value: String(y), label: String(y) }))}
              value={String(selectedYear)}
              onChange={(v) => { if (v !== null) setSelectedYear(Number(v)); }}
              radius="md"
              w={100}
            />
          </Group>
        </div>

        {rows.length === 0 ? (
          <div className="budget-page__empty">
            Ingen utlegg i denne perioden.
          </div>
        ) : (
          <div className="budget-page__categories">
            {rows.map(({ key, label, Icon, amount }) => {
              const pct = grandTotal > 0 ? (amount / grandTotal) * 100 : 0;
              return (
                <div key={key} className="budget-category">
                  <div className="budget-category__top">
                    <div className="budget-category__left">
                      <span className="budget-category__icon">
                        <Icon size={18} />
                      </span>
                      <span className="budget-category__label">{label}</span>
                    </div>
                    <div className="budget-category__right">
                      <span className="budget-category__amount">{formatCurrency(amount, currency)}</span>
                      <span className="budget-category__pct">{Math.round(pct)}%</span>
                    </div>
                  </div>
                  <Progress value={pct} color="violet" radius="xl" size="sm" />
                </div>
              );
            })}

            <div className="budget-category budget-category--total">
              <div className="budget-category__top">
                <span className="budget-category__label">Totalt</span>
                <span className="budget-category__amount">{formatCurrency(grandTotal, currency)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
