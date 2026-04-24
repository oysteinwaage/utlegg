import { useState, useEffect } from 'react';
import { Modal, Button, TextInput, Select, Stack, Text, Alert, Loader } from '@mantine/core';
import { ref, get, push, set } from 'firebase/database';
import { IconAlertCircle } from '@tabler/icons-react';
import { database } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { CURRENCIES } from '../../services/currencyService';

export default function CreateSharingModal({ opened, onClose, onCreated }) {
  const { currentUser, userProfile } = useAuth();
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('NOK');
  const [otherUserId, setOtherUserId] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchingUsers, setFetchingUsers] = useState(false);

  useEffect(() => {
    if (!opened) return;
    setFetchingUsers(true);
    get(ref(database, 'users'))
      .then((snapshot) => {
        if (!snapshot.exists()) {
          setAllUsers([]);
          return;
        }
        const data = snapshot.val();
        const isAdmin = userProfile?.roles?.includes('ADMIN');
        const users = Object.entries(data)
          .filter(([uid]) => uid !== currentUser.uid)
          .filter(([, user]) => isAdmin || !user.roles?.includes('TEST_USER'))
          .map(([uid, user]) => ({
            value: uid,
            label: `${user.name} (${user.email})`,
          }));
        setAllUsers(users);
      })
      .finally(() => setFetchingUsers(false));
  }, [opened, currentUser.uid]);

  function handleClose() {
    setName('');
    setCurrency('NOK');
    setOtherUserId(null);
    setError('');
    onClose();
  }

  async function handleSubmit() {
    if (!name.trim()) return setError('Navn på delingen er påkrevd.');
    if (!otherUserId) return setError('Du må velge en annen deltaker.');

    setLoading(true);
    setError('');

    try {
      const participants = {
        [currentUser.uid]: true,
        [otherUserId]: true,
      };

      const sharingsRef = ref(database, 'sharings');
      const newRef = push(sharingsRef);
      const sharingData = {
        name: name.trim(),
        defaultCurrency: currency,
        participants,
        createdBy: currentUser.uid,
        createdAt: Date.now(),
        isActive: true,
        lastSettlementAt: null,
      };

      await set(newRef, sharingData);

      // Index each participant's sharings for fast lookup
      await Promise.all([
        set(ref(database, `userSharings/${currentUser.uid}/${newRef.key}`), true),
        set(ref(database, `userSharings/${otherUserId}/${newRef.key}`), true),
      ]);

      onCreated(newRef.key);
      handleClose();
    } catch (err) {
      setError('Noe gikk galt. Prøv igjen.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const currencyOptions = CURRENCIES.map((c) => ({
    value: c.value,
    label: c.label,
  }));

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
          onChange={setCurrency}
          radius="md"
          required
        />

        {fetchingUsers ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Loader size="xs" />
            <Text size="sm" c="dimmed">Laster brukere…</Text>
          </div>
        ) : (
          <Select
            label="Velg den andre deltakeren"
            placeholder="Søk etter bruker…"
            data={allUsers}
            value={otherUserId}
            onChange={setOtherUserId}
            radius="md"
            searchable
            nothingFoundMessage="Ingen andre brukere funnet. Den andre personen må logge inn én gang først."
            required
          />
        )}

        <Text size="xs" c="dimmed">
          Begge deltakere er du selv og personen du velger. Den andre personen må ha logget inn
          i appen minst én gang.
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
