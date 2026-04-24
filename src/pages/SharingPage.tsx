import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button, Modal, Text, Stack, Center, Loader, Badge } from '@mantine/core';
import {
  IconPlus, IconArrowLeft, IconX, IconRefresh, IconAlertTriangle, IconTrophy, IconTrash,
} from '@tabler/icons-react';
import { ref, onValue, push, set, update, get, remove } from 'firebase/database';
import { database } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/AppLayout';
import ExpenseList from '../components/expense/ExpenseList';
import AddExpenseModal from '../components/expense/AddExpenseModal';
import { formatCurrency, formatShortDate, getInitials } from '../utils/formatUtils';
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

interface SettlementResult {
  debtorId: string;
  creditorId: string;
  debtAmount: number;
  t1: number;
  t2: number;
  uid1: string;
  uid2: string;
}

function computeSettlement(
  totals: Record<string, number>,
  participantIds: string[],
): SettlementResult {
  const [uid1, uid2] = participantIds as [string, string];
  const t1 = totals[uid1] || 0;
  const t2 = totals[uid2] || 0;
  const debtAmount = Math.round((Math.abs(t1 - t2) / 2) * 100) / 100;
  const debtorId   = t1 >= t2 ? uid2 : uid1;
  const creditorId = t1 >= t2 ? uid1 : uid2;
  return { debtorId, creditorId, debtAmount, t1, t2, uid1, uid2 };
}

// ── Participant Card ──────────────────────────────────────────────────────────

interface ParticipantCardProps {
  profile: UserProfile | undefined;
  total: number;
  diff: number;
  defaultCurrency: string;
  isCurrentUser: boolean;
}

function ParticipantCard({ profile, total, diff, defaultCurrency, isCurrentUser }: ParticipantCardProps) {
  const diffDisplay = diff === 0
    ? null
    : diff > 0
      ? `+${formatCurrency(diff, defaultCurrency)}`
      : formatCurrency(diff, defaultCurrency);

  const diffClass = diff > 0
    ? 'participant-card__diff--positive'
    : diff < 0
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
          {isCurrentUser && <span>deg</span>}
        </p>
      </div>
      <p className="participant-card__total">{formatCurrency(total, defaultCurrency)}</p>
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
  totals: Record<string, number>;
  defaultCurrency: string;
}

function ClosingStatus({ participants, participantIds, totals, defaultCurrency }: ClosingStatusProps) {
  const { debtorId, creditorId, debtAmount } = computeSettlement(totals, participantIds);
  const debtor   = participants[debtorId];
  const creditor = participants[creditorId];

  return (
    <div className="closing-status">
      <h3 className="closing-status__title">
        <IconTrophy size={18} />
        Delingen er avsluttet — Sluttstatus
      </h3>
      {debtAmount === 0 ? (
        <p className="closing-status__summary">Begge har betalt like mye. Ingen skylder noen noe!</p>
      ) : (
        <p className="closing-status__summary">
          <strong>{debtor?.name}</strong> skylder <strong>{creditor?.name}</strong>{' '}
          <strong>{formatCurrency(debtAmount, defaultCurrency)}</strong>
        </p>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SharingPage() {
  const { id } = useParams<{ id: string }>();
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = userProfile?.roles?.includes('ADMIN') ?? false;

  const [sharing, setSharing] = useState<Sharing | null>(null);
  const [participants, setParticipants] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);

  const [addExpenseOpen, setAddExpenseOpen]         = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen]     = useState(false);
  const [settlementConfirmOpen, setSettlementConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen]   = useState(false);

  useEffect(() => {
    if (!id) return;
    const sharingRef = ref(database, `sharings/${id}`);

    const unsub = onValue(sharingRef, (snap) => {
      if (!snap.exists()) { navigate('/overview'); return; }
      const data = snap.val() as Omit<Sharing, 'id'>;
      if (!data.participants?.[currentUser!.uid]) { navigate('/overview'); return; }
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

  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);
  const fairShare  = grandTotal / 2;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleAddExpense({
    description, amount, currency, amountInDefault,
  }: { description: string; amount: number; currency: string; amountInDefault: number }) {
    const expensesRef = ref(database, `sharings/${id}/expenses`);
    const newRef = push(expensesRef);
    const entry: Omit<ExpenseRecord, 'defaultCurrency'> = {
      type: 'expense',
      description,
      amount,
      currency,
      amountInDefault,
      paidBy: currentUser!.uid,
      timestamp: Date.now(),
    };
    await set(newRef, entry);
  }

  async function handleSettlement() {
    const { debtorId, creditorId, debtAmount, t1, t2, uid1, uid2 } =
      computeSettlement(totals, participantIds);

    const debtor   = participants[debtorId];
    const creditor = participants[creditorId];
    const dateStr  = formatShortDate(Date.now());
    const defaultCurrency = sharing!.defaultCurrency;

    const descriptionText =
      debtAmount > 0
        ? `Nullstiller ${dateStr}. ${debtor?.name} skylder ${creditor?.name} ${formatCurrency(debtAmount, defaultCurrency)}`
        : `Nullstiller ${dateStr}. Ingen skylder noen noe.`;

    const now = Date.now();
    const settlementEntry: Omit<SettlementRecord, 'defaultCurrency'> = {
      type: 'settlement',
      description: descriptionText,
      debtorId,
      creditorId,
      debtAmount,
      user1Id: uid1,
      user2Id: uid2,
      user1Amount: t1,
      user2Amount: t2,
      currency: defaultCurrency,
      transferred: false,
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
        <div className="sharing-page__title-area">
          <Link to="/overview" className="sharing-page__back-link">
            <IconArrowLeft size={14} />
            Tilbake til oversikt
          </Link>
          <h1 className="sharing-page__title">{sharing.name}</h1>
          <div className="sharing-page__currency-badge">{sharing.defaultCurrency}</div>
        </div>

        <div className="sharing-page__actions">
          {isActive && (
            <>
              <Button
                variant="light"
                color="violet"
                radius="md"
                leftSection={<IconRefresh size={16} />}
                onClick={() => setSettlementConfirmOpen(true)}
              >
                Avregning
              </Button>
              <Button
                variant="light"
                color="red"
                radius="md"
                leftSection={<IconX size={16} />}
                onClick={() => setCloseConfirmOpen(true)}
              >
                Avslutt
              </Button>
            </>
          )}
          {!isActive && (
            <>
              <Badge color="gray" variant="light" size="lg" radius="md">Avsluttet</Badge>
              <Button
                variant="light"
                color="red"
                radius="md"
                leftSection={<IconTrash size={16} />}
                onClick={() => setDeleteConfirmOpen(true)}
              >
                Slett
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Participant Cards */}
      <div className="participant-cards">
        {participantIds.map((uid) => {
          const total = totals[uid] || 0;
          const diff  = total - fairShare;
          return (
            <ParticipantCard
              key={uid}
              profile={participants[uid]}
              total={total}
              diff={diff}
              defaultCurrency={sharing.defaultCurrency}
              isCurrentUser={uid === currentUser!.uid}
            />
          );
        })}
      </div>

      {/* Closing status */}
      {!isActive && (
        <ClosingStatus
          participants={participants}
          participantIds={participantIds}
          totals={totals}
          defaultCurrency={sharing.defaultCurrency}
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
        defaultCurrency={sharing.defaultCurrency}
        currentUserId={currentUser!.uid}
        isAdmin={isAdmin}
        lastSettlementAt={sharing.lastSettlementAt ?? 0}
      />

      {/* Add Expense Modal */}
      <AddExpenseModal
        opened={addExpenseOpen}
        onClose={() => setAddExpenseOpen(false)}
        onSubmit={handleAddExpense}
        defaultCurrency={sharing.defaultCurrency}
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
            const { debtorId, creditorId, debtAmount } = computeSettlement(totals, participantIds);
            const debtor   = participants[debtorId];
            const creditor = participants[creditorId];
            return (
              <Text size="sm">
                {debtAmount > 0 ? (
                  <>
                    <strong>{debtor?.name}</strong> skylder <strong>{creditor?.name}</strong>{' '}
                    <strong>{formatCurrency(debtAmount, sharing.defaultCurrency)}</strong> basert på
                    gjeldende utlegg. Summene nullstilles etter avregning.
                  </>
                ) : (
                  'Begge har betalt like mye. Summene nullstilles.'
                )}
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
