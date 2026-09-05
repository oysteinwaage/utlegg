import { useState, useEffect } from 'react';
import { Modal, Button, TextInput, Select, MultiSelect, Stack, Text, Alert, Loader } from '@mantine/core';
import { ref, get, push, set } from 'firebase/database';
import { IconAlertCircle } from '@tabler/icons-react';
import { database } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { CURRENCIES } from '../../services/currencyService';
import type { UserProfile } from '../../types';

interface CreateSharingModalProps {
  opened: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export default function CreateSharingModal({ opened, onClose, onCreated }: CreateSharingModalProps) {
  const { currentUser, userProfile } = useAuth();
  const [name, setName]             = useState('');
  const [currency, setCurrency]     = useState('NOK');
  const [otherUserIds, setOtherUserIds] = useState<string[]>([]);
  const [allUsers, setAllUsers]     = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [fetchingUsers, setFetchingUsers] = useState(false);

  useEffect(() => {
    if (!opened) return;
    setFetchingUsers(true);
    get(ref(database, 'users'))
      .then((snapshot) => {
        if (!snapshot.exists()) { setAllUsers([]); return; }
        const data = snapshot.val() as Record<string, UserProfile>;
        const isAdmin = userProfile?.roles?.includes('ADMIN');
        const users = Object.entries(data)
          .filter(([uid]) => uid !== currentUser!.uid)
          .filter(([, user]) => isAdmin || !user.roles?.includes('TEST_USER'))
          .map(([uid, user]) => ({
            value: uid,
            label: `${user.name} (${user.email})`,
          }));
        setAllUsers(users);
      })
      .finally(() => setFetchingUsers(false));
  }, [opened, currentUser, userProfile]);

  function handleClose() {
    setName('');
    setCurrency('NOK');
    setOtherUserIds([]);
    setError('');
    onClose();
  }

  async function handleSubmit() {
    if (!name.trim()) return setError('Navn på delingen er påkrevd.');
    if (otherUserIds.length === 0) return setError('Du må velge minst én annen deltaker.');

    setLoading(true);
    setError('');

    try {
      const allUids = [currentUser!.uid, ...otherUserIds];
      const participants: Record<string, true> = {};
      allUids.forEach((uid) => { participants[uid] = true; });

      const sharingsRef = ref(database, 'sharings');
      const newRef      = push(sharingsRef);
      const sharingData = {
        name: name.trim(),
        defaultCurrency: currency,
        participants,
        createdBy: currentUser!.uid,
        createdAt: Date.now(),
        isActive: true,
        lastSettlementAt: null,
      };

      await set(newRef, sharingData);
      await Promise.all(
        allUids.map((uid) => set(ref(database, `userSharings/${uid}/${newRef.key}`), true)),
      );

      onCreated(newRef.key!);
      handleClose();
    } catch (err) {
      setError('Noe gikk galt. Prøv igjen.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const currencyOptions = CURRENCIES.map((c) => ({ value: c.value, label: c.label }));

  return (
    <Modal opened={opened} onClose={handleClose} title="Ny deling" size="md" radius="md">
      <Stack gap="md">
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" radius="md">
            {error}
          </Alert>
        )}

        <TextInput
          label="Navn på delingen"
          placeholder="F.eks. Ferietur 2025"
          value={name}
          onChange={(e) => setName(e.target.value)}
          radius="md"
          required
        />

        <Select
          label="Standard valuta"
          data={currencyOptions}
          value={currency}
          onChange={(val) => { if (val) setCurrency(val); }}
          radius="md"
          required
        />

        {fetchingUsers ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Loader size="xs" />
            <Text size="sm" c="dimmed">Laster brukere…</Text>
          </div>
        ) : (
          <MultiSelect
            label="Velg de andre deltakerne"
            placeholder="Søk etter brukere…"
            data={allUsers}
            value={otherUserIds}
            onChange={(val) => setOtherUserIds(val)}
            radius="md"
            searchable
            nothingFoundMessage="Ingen andre brukere funnet. De andre personene må logge inn én gang først."
            required
          />
        )}

        <Text size="xs" c="dimmed">
          Du er selv deltaker, i tillegg til personene du velger. De andre personene må ha
          logget inn i appen minst én gang.
        </Text>

        <Button
          onClick={handleSubmit}
          loading={loading}
          radius="md"
          color="violet"
          fullWidth
          mt="xs"
        >
          Opprett deling
        </Button>
      </Stack>
    </Modal>
  );
}
