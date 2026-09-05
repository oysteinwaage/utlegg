import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button, ActionIcon, Menu, Modal, Text, Stack, Center, Loader, Badge } from '@mantine/core';
import {
  IconPlus, IconArrowLeft, IconX, IconRefresh, IconAlertTriangle, IconTrophy, IconTrash,
  IconDotsVertical, IconChartPie, IconFileImport,
} from '@tabler/icons-react';
import { ref, onValue, push, set, update, get, remove } from 'firebase/database';
import { database } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/AppLayout';
import ExpenseList from '../components/expense/ExpenseList';
import AddExpenseModal from '../components/expense/AddExpenseModal';
import ImportTransactionsModal, { type ImportedExpense } from '../components/sharing/ImportTransactionsModal';
import { formatCurrency, formatShortDate, getInitials } from '../utils/formatUtils';
import { getExchangeRate } from '../services/currencyService';
import type { Sharing, UserProfile, AnyEntry, ExpenseRecord, SettlementRecord } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeTotals(
  expenses: Record<string, AnyEntry> | undefined,
  lastSettlementAt: number | null,
): Record<string, number> {
  if (!expenses) return {};
  return Object.values(expenses)
    .filter((e): e is ExpenseRecord => e.type === 'expense')
    .filter((e) => !lastSettlementAt || e.timestamp > lastSettlementAt)
    .reduce<Record<string, number>>((acc, e) => {
      acc[e.paidBy] = (acc[e.paidBy] || 0) + (e.amountInDefault || 0);
      return acc;
    }, {});
}

function computeNetBalances(
  expenses: Record<string, AnyEntry> | undefined,
  lastSettlementAt: number | null,
  participantIds: string[],
): Record<string, number> {
  const paid: Record<string, number> = {};
  const owed: Record<string, number> = {};
  participantIds.forEach((uid) => { paid[uid] = 0; owed[uid] = 0; });

  if (expenses) {
    Object.values(expenses)
      .filter((e): e is ExpenseRecord => e.type === 'expense')
      .filter((e) => !lastSettlementAt || e.timestamp > lastSettlementAt)
      .forEach((e) => {
        paid[e.paidBy] = (paid[e.paidBy] || 0) + e.amountInDefault;
        const among = (e.splitAmong && e.splitAmong.length > 0) ? e.splitAmong : participantIds;
        const share = e.amountInDefault / among.length;
        among.forEach((uid) => { owed[uid] = (owed[uid] || 0) + share; });
      });
  }

  const balances: Record<string, number> = {};
  participantIds.forEach((uid) => {
    balances[uid] = Math.round(((paid[uid] || 0) - (owed[uid] || 0)) * 100) / 100;
  });
  return balances;
}

interface SettlementTxn {
  debtorId: string;
  creditorId: string;
  amount: number;
}

// Grådig minimal-overføringsalgoritme: match største skyldner mot største kreditor.
function computeSettlementTxns(
  netBalances: Record<string, number>,
  participantIds: string[],
): SettlementTxn[] {
  const debtors:   { id: string; amt: number }[] = [];
  const creditors: { id: string; amt: number }[] = [];
  participantIds.forEach((id) => {
    const b = netBalances[id] || 0;
    if (b < -0.005) debtors.push({ id, amt: -b });
    else if (b > 0.005) creditors.push({ id, amt: b });
  });
  debtors.sort((a, b) => b.amt - a.amt);
  creditors.sort((a, b) => b.amt - a.amt);

  const txns: SettlementTxn[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    txns.push({
      debtorId: debtors[i].id,
      creditorId: creditors[j].id,
      amount: Math.round(pay * 100) / 100,
    });
    debtors[i].amt -= pay; creditors[j].amt -= pay;
    if (debtors[i].amt < 0.005) i++;
    if (creditors[j].amt < 0.005) j++;
  }
  return txns;
}

// ── Participant Card ──────────────────────────────────────────────────────────

interface ParticipantCardProps {
  profile: UserProfile | undefined;
  total: number;
  diff: number;
  defaultCurrency: string;
  preferredCurrency?: string;
  conversionRate?: number;
}

function ParticipantCard({ profile, total, diff, defaultCurrency, preferredCurrency, conversionRate = 1 }: ParticipantCardProps) {
  const useConverted = preferredCurrency && preferredCurrency !== defaultCurrency;
  const displayDiff = useConverted ? diff * conversionRate : diff;
  const displayCurrency = (useConverted && preferredCurrency) ? preferredCurrency : defaultCurrency;

  const diffDisplay = displayDiff === 0
    ? null
    : displayDiff > 0
      ? `+${formatCurrency(displayDiff, displayCurrency)}`
      : formatCurrency(displayDiff, displayCurrency);

  const diffClass = displayDiff > 0
    ? 'participant-card__diff--positive'
    : displayDiff < 0
      ? 'participant-card__diff--negative'
      : 'participant-card__diff--neutral';

  return (
    <div className="participant-card">
      <div className="participant-card__header">
        <div className="participant-card__avatar">
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt={profile.name} />
          ) : (
            getInitials(profile?.name)
          )}
        </div>
        <p className="participant-card__name">
          {profile?.name || 'Ukjent'}
          <span>{preferredCurrency ?? '-'}</span>
        </p>
      </div>
      <p className="participant-card__total">{formatCurrency(useConverted ? total * conversionRate : total, displayCurrency)}</p>
      {diffDisplay && (
        <p className={`participant-card__diff ${diffClass}`}>{diffDisplay}</p>
      )}
    </div>
  );
}

// ── Closing Status ────────────────────────────────────────────────────────────

interface ClosingStatusProps {
  participants: Record<string, UserProfile>;
  participantIds: string[];
  netBalances: Record<string, number>;
  defaultCurrency: string;
  preferredCurrency?: string;
  conversionRate?: number;
}

function ClosingStatus({ participants, participantIds, netBalances, defaultCurrency, preferredCurrency, conversionRate = 1 }: ClosingStatusProps) {
  const txns = computeSettlementTxns(netBalances, participantIds);
  const showConverted = preferredCurrency && preferredCurrency !== defaultCurrency;

  return (
    <div className="closing-status">
      <h3 className="closing-status__title">
        <IconTrophy size={18} />
        Delingen er avsluttet — Sluttstatus
      </h3>
      {txns.length === 0 ? (
        <p className="closing-status__summary">Alle har betalt like mye. Ingen skylder noen noe!</p>
      ) : (
        txns.map((txn, idx) => (
          <p key={idx} className="closing-status__summary">
            <strong>{participants[txn.debtorId]?.name}</strong> skylder{' '}
            <strong>{participants[txn.creditorId]?.name}</strong>{' '}
            <strong>{formatCurrency(txn.amount, defaultCurrency)}</strong>
            {showConverted && (
              <> (≈ <strong>{formatCurrency(txn.amount * conversionRate, preferredCurrency!)}</strong>)</>
            )}
          </p>
        ))
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SharingPage() {
  const { id } = useParams<{ id: string }>();
  const { currentUser, currentUserId, userProfile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = userProfile?.roles?.includes('ADMIN') ?? false;

  const [sharing, setSharing] = useState<Sharing | null>(null);
  const [participants, setParticipants] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);

  const [addExpenseOpen, setAddExpenseOpen]         = useState(false);
  const [importOpen, setImportOpen]                 = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen]     = useState(false);
  const [settlementConfirmOpen, setSettlementConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen]   = useState(false);
  const [conversionRates, setConversionRates]       = useState<Record<string, number>>({});

  useEffect(() => {
    if (!id) return;
    const sharingRef = ref(database, `sharings/${id}`);

    const unsub = onValue(sharingRef, (snap) => {
      if (!snap.exists()) { navigate('/overview'); return; }
      const data = snap.val() as Omit<Sharing, 'id'>;
      if (!data.participants?.[currentUserId]) { navigate('/overview'); return; }
      setSharing({ id: snap.key!, ...data });
      setLoading(false);
    });

    return () => unsub();
  }, [id, currentUser, navigate]);

  useEffect(() => {
    if (!sharing?.participants) return;
    const uids = Object.keys(sharing.participants);
    Promise.all(uids.map((uid) => get(ref(database, `users/${uid}`)))).then((snaps) => {
      const profiles: Record<string, UserProfile> = {};
      snaps.forEach((s) => { if (s.exists()) profiles[s.key!] = s.val() as UserProfile; });
      setParticipants(profiles);
    });
  }, [sharing?.participants]);

  const participantIds = useMemo(
    () => (sharing?.participants ? Object.keys(sharing.participants) : []),
    [sharing?.participants],
  );

  const totals = useMemo(
    () => computeTotals(sharing?.expenses, sharing?.lastSettlementAt ?? null),
    [sharing?.expenses, sharing?.lastSettlementAt],
  );

  const netBalances = useMemo(
    () => computeNetBalances(sharing?.expenses, sharing?.lastSettlementAt ?? null, participantIds),
    [sharing?.expenses, sharing?.lastSettlementAt, participantIds],
  );

  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);
  const preferredCurrency = userProfile?.preferredCurrency;

  useEffect(() => {
    if (!sharing || Object.keys(participants).length === 0) return;
    const uniqueCurrencies = [
      ...new Set(
        Object.values(participants)
          .map((p) => p.preferredCurrency)
          .filter((c): c is string => !!c && c !== sharing.defaultCurrency),
      ),
    ];
    if (uniqueCurrencies.length === 0) { setConversionRates({}); return; }
    Promise.all(
      uniqueCurrencies.map((currency) =>
        getExchangeRate(sharing.defaultCurrency, currency)
          .then((rate): [string, number | null] => [currency, rate])
          .catch((): [string, number | null] => [currency, null]),
      ),
    ).then((results) => {
      const rates: Record<string, number> = {};
      results.forEach(([currency, rate]) => { if (rate !== null) rates[currency] = rate; });
      setConversionRates(rates);
    });
  }, [sharing?.defaultCurrency, participants]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleAddExpense({
    description, amount, currency, amountInDefault, splitAmong, category,
  }: { description: string; amount: number; currency: string; amountInDefault: number; splitAmong?: string[]; category?: ExpenseRecord['category'] }) {
    const expensesRef = ref(database, `sharings/${id}/expenses`);
    const newRef = push(expensesRef);
    const entry: Omit<ExpenseRecord, 'defaultCurrency'> = {
      type: 'expense',
      description,
      amount,
      currency,
      amountInDefault,
      paidBy: currentUserId,
      timestamp: Date.now(),
      ...(splitAmong && splitAmong.length > 0 ? { splitAmong } : {}),
      ...(category ? { category } : {}),
    };
    await set(newRef, entry);
  }

  async function handleImportTransactions(entries: ImportedExpense[]) {
    const defaultCurrency = sharing!.defaultCurrency;
    const uniqueCurrencies = [...new Set(entries.map((e) => e.currency))].filter((c) => c !== defaultCurrency);
    const rateEntries = await Promise.all(
      uniqueCurrencies.map(async (currency): Promise<[string, number]> => [currency, await getExchangeRate(currency, defaultCurrency)]),
    );
    const rates = Object.fromEntries(rateEntries);

    const expensesRef = ref(database, `sharings/${id}/expenses`);
    await Promise.all(entries.map((entry) => {
      const rate = entry.currency === defaultCurrency ? 1 : (rates[entry.currency] ?? 1);
      const newRef = push(expensesRef);
      const record: Omit<ExpenseRecord, 'defaultCurrency'> = {
        type: 'expense',
        description: entry.description,
        amount: entry.amount,
        currency: entry.currency,
        amountInDefault: Math.round(entry.amount * rate * 100) / 100,
        paidBy: currentUserId,
        timestamp: entry.timestamp,
        importedFromStatement: true,
        ...(entry.category ? { category: entry.category } : {}),
      };
      return set(newRef, record);
    }));
  }

  async function handleSettlement() {
    const txns = computeSettlementTxns(netBalances, participantIds);
    const dateStr  = formatShortDate(Date.now());
    const defaultCurrency = sharing!.defaultCurrency;

    const descriptionText =
      txns.length > 0
        ? `Nullstiller ${dateStr}. ` +
          txns
            .map((t) => `${participants[t.debtorId]?.name} skylder ${participants[t.creditorId]?.name} ${formatCurrency(t.amount, defaultCurrency)}`)
            .join('; ')
        : `Nullstiller ${dateStr}. Ingen skylder noen noe.`;

    const fullTotals: Record<string, number> = {};
    participantIds.forEach((uid) => { fullTotals[uid] = totals[uid] || 0; });

    const now = Date.now();
    const settlementEntry: Omit<SettlementRecord, 'defaultCurrency'> = {
      type: 'settlement',
      description: descriptionText,
      totals: fullTotals,
      transactions: txns.map((t) => ({ ...t, transferred: false })),
      currency: defaultCurrency,
      timestamp: now,
    };

    const expensesRef = ref(database, `sharings/${id}/expenses`);
    const newExpRef   = push(expensesRef);
    await set(newExpRef, settlementEntry);
    await update(ref(database, `sharings/${id}`), { lastSettlementAt: now });
    setSettlementConfirmOpen(false);
  }

  async function handleClose() {
    await update(ref(database, `sharings/${id}`), { isActive: false });
    setCloseConfirmOpen(false);
  }

  async function handleToggleImport() {
    await update(ref(database, `sharings/${id}`), { importEnabled: !sharing!.importEnabled });
  }

  async function handleDelete() {
    const pids = Object.keys(sharing!.participants || {});
    await remove(ref(database, `sharings/${id}`));
    await Promise.all(pids.map((uid) => remove(ref(database, `userSharings/${uid}/${id}`))));
    navigate('/overview');
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading || !sharing) {
    return (
      <AppLayout>
        <Center h={400}><Loader color="violet" /></Center>
      </AppLayout>
    );
  }

  const isActive = sharing.isActive;

  return (
    <AppLayout>
      {/* Header */}
      <div className="sharing-page__header">
        <div className="sharing-page__top-row">
          <Link to="/overview" className="sharing-page__back-link">
            <IconArrowLeft size={14} />
            Tilbake til oversikt
          </Link>

          <div className="sharing-page__actions">
            {!isActive && <Badge color="gray" variant="light" size="lg" radius="md">Avsluttet</Badge>}
            <Menu shadow="md" radius="md" position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon variant="light" color="gray" size="lg" radius="md" aria-label="Handlinger">
                  <IconDotsVertical size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconChartPie size={16} />} onClick={() => navigate(`/sharing/${id}/budget`)}>
                  Budsjett
                </Menu.Item>
                {isAdmin && (
                  <>
                    <Menu.Divider />
                    <Menu.Item leftSection={<IconFileImport size={16} />} onClick={handleToggleImport}>
                      {sharing.importEnabled ? 'Deaktiver import' : 'Aktiver import'}
                    </Menu.Item>
                  </>
                )}
                {isActive && (
                  <>
                    <Menu.Divider />
                    <Menu.Item leftSection={<IconRefresh size={16} />} onClick={() => setSettlementConfirmOpen(true)}>
                      Avregning
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item leftSection={<IconX size={16} />} color="red" onClick={() => setCloseConfirmOpen(true)}>
                      Avslutt deling
                    </Menu.Item>
                  </>
                )}
                {!isActive && (
                  <>
                    <Menu.Divider />
                    <Menu.Item leftSection={<IconTrash size={16} />} color="red" onClick={() => setDeleteConfirmOpen(true)}>
                      Slett deling
                    </Menu.Item>
                  </>
                )}
              </Menu.Dropdown>
            </Menu>
          </div>
        </div>

        <div className="sharing-page__title-area">
          <h1 className="sharing-page__title">{sharing.name}</h1>
          <div className="sharing-page__currency-badge">{sharing.defaultCurrency}</div>
        </div>
      </div>

      {/* Participant Cards */}
      <div className="participant-cards">
        {participantIds.map((uid) => {
          const total = totals[uid] || 0;
          const diff  = netBalances[uid] || 0;
          const pCurrency = participants[uid]?.preferredCurrency;
          const pRate = pCurrency !== undefined ? conversionRates[pCurrency] : undefined;
          const showCurrency = pRate !== undefined || pCurrency === sharing.defaultCurrency;
          return (
            <ParticipantCard
              key={uid}
              profile={participants[uid]}
              total={total}
              diff={diff}
              defaultCurrency={sharing.defaultCurrency}
              preferredCurrency={showCurrency ? pCurrency : undefined}
              conversionRate={pRate ?? 1}
            />

          );
        })}
      </div>

      {/* Closing status */}
      {!isActive && (
        <ClosingStatus
          participants={participants}
          participantIds={participantIds}
          netBalances={netBalances}
          defaultCurrency={sharing.defaultCurrency}
          preferredCurrency={preferredCurrency && conversionRates[preferredCurrency] !== undefined ? preferredCurrency : undefined}
          conversionRate={preferredCurrency ? (conversionRates[preferredCurrency] ?? 1) : 1}
        />
      )}

      {/* Action bar */}
      {isActive && (
        <div className="action-bar">
          <Button
            leftSection={<IconPlus size={16} />}
            radius="md"
            color="violet"
            onClick={() => setAddExpenseOpen(true)}
          >
            Legg til utlegg
          </Button>
          {sharing.importEnabled && (
            <Button
              leftSection={<IconFileImport size={16} />}
              radius="md"
              variant="light"
              color="violet"
              onClick={() => setImportOpen(true)}
            >
              Importer fra DNB
            </Button>
          )}
          <div className="action-bar__spacer" />
          <Text size="sm" c="dimmed">
            Totalt lagt ut: {formatCurrency(grandTotal, sharing.defaultCurrency)}
          </Text>
        </div>
      )}

      {/* Expense List */}
      <ExpenseList
        expenses={sharing.expenses}
        sharingId={id!}
        participants={participants}
        participantIds={participantIds}
        defaultCurrency={sharing.defaultCurrency}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        lastSettlementAt={sharing.lastSettlementAt ?? 0}
      />

      {/* Add Expense Modal */}
      <AddExpenseModal
        opened={addExpenseOpen}
        onClose={() => setAddExpenseOpen(false)}
        onSubmit={handleAddExpense}
        defaultCurrency={sharing.defaultCurrency}
        participants={participants}
        participantIds={participantIds}
      />

      {/* Import Transactions Modal */}
      <ImportTransactionsModal
        opened={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImportTransactions}
      />

      {/* Settlement Confirm Modal */}
      <Modal
        opened={settlementConfirmOpen}
        onClose={() => setSettlementConfirmOpen(false)}
        title="Bekreft avregning"
        size="sm"
        radius="md"
      >
        <Stack gap="md">
          {(() => {
            if (participantIds.length < 2) return null;
            const txns = computeSettlementTxns(netBalances, participantIds);
            const showConverted = preferredCurrency && conversionRates[preferredCurrency] !== undefined && preferredCurrency !== sharing.defaultCurrency;
            if (txns.length === 0) {
              return <Text size="sm">Alle har betalt like mye. Summene nullstilles.</Text>;
            }
            return (
              <Text size="sm">
                {txns.map((txn, idx) => (
                  <span key={idx} style={{ display: 'block' }}>
                    <strong>{participants[txn.debtorId]?.name}</strong> skylder{' '}
                    <strong>{participants[txn.creditorId]?.name}</strong>{' '}
                    <strong>{formatCurrency(txn.amount, sharing.defaultCurrency)}</strong>
                    {showConverted && (
                      <> (≈ <strong>{formatCurrency(txn.amount * conversionRates[preferredCurrency!], preferredCurrency!)}</strong>)</>
                    )}
                  </span>
                ))}
                <span style={{ display: 'block', marginTop: 8 }}>
                  Basert på gjeldende utlegg. Summene nullstilles etter avregning.
                </span>
              </Text>
            );
          })()}
          <Button
            color="violet"
            radius="md"
            onClick={handleSettlement}
            leftSection={<IconRefresh size={16} />}
          >
            Bekreft avregning
          </Button>
          <Button variant="subtle" radius="md" onClick={() => setSettlementConfirmOpen(false)}>
            Avbryt
          </Button>
        </Stack>
      </Modal>

      {/* Close Sharing Confirm Modal */}
      <Modal
        opened={closeConfirmOpen}
        onClose={() => setCloseConfirmOpen(false)}
        title="Avslutt deling"
        size="sm"
        radius="md"
      >
        <Stack gap="md">
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <IconAlertTriangle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
            <Text size="sm">
              Er du sikker på at du vil avslutte delingen <strong>{sharing.name}</strong>? Det vil
              ikke lenger være mulig å legge til nye utlegg, og delingen vil markeres som avsluttet.
            </Text>
          </div>
          <Button
            color="red"
            radius="md"
            onClick={handleClose}
            leftSection={<IconX size={16} />}
          >
            Ja, avslutt delingen
          </Button>
          <Button variant="subtle" radius="md" onClick={() => setCloseConfirmOpen(false)}>
            Avbryt
          </Button>
        </Stack>
      </Modal>

      {/* Delete Sharing Confirm Modal */}
      <Modal
        opened={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Slett deling"
        size="sm"
        radius="md"
      >
        <Stack gap="md">
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <IconAlertTriangle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
            <Text size="sm">
              Er du sikker på at du vil slette <strong>{sharing.name}</strong>? All data,
              inkludert alle utlegg, slettes permanent og kan ikke gjenopprettes.
            </Text>
          </div>
          <Button
            color="red"
            radius="md"
            onClick={handleDelete}
            leftSection={<IconTrash size={16} />}
          >
            Ja, slett delingen
          </Button>
          <Button variant="subtle" radius="md" onClick={() => setDeleteConfirmOpen(false)}>
            Avbryt
          </Button>
        </Stack>
      </Modal>
    </AppLayout>
  );
}
