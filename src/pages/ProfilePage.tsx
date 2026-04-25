import { useState, useEffect } from 'react';
import { Select, Button, Alert } from '@mantine/core';
import { IconAlertCircle, IconCheck, IconUser } from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/AppLayout';
import { CURRENCIES } from '../services/currencyService';
import { getInitials } from '../utils/formatUtils';

export default function ProfilePage() {
  const { currentUser, userProfile, updateUserProfile } = useAuth();
  const [preferredCurrency, setPreferredCurrency] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setPreferredCurrency(userProfile?.preferredCurrency ?? null);
  }, [userProfile?.preferredCurrency]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      await updateUserProfile({ preferredCurrency: preferredCurrency ?? undefined });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Kunne ikke lagre innstillinger. Prøv igjen.');
    } finally {
      setSaving(false);
    }
  }

  const currencyOptions = CURRENCIES.map((c) => ({ value: c.value, label: c.label }));

  return (
    <AppLayout>
      <div className="profile-page__header">
        <h1 className="profile-page__title">Min side</h1>
      </div>

      <div className="profile-page__card">
        <div className="profile-page__user-section">
          <div className="profile-page__avatar">
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt={currentUser.displayName ?? ''} />
            ) : (
              <span>{getInitials(currentUser?.displayName) || <IconUser size={28} />}</span>
            )}
          </div>
          <div className="profile-page__user-info">
            <p className="profile-page__user-name">{userProfile?.name ?? currentUser?.displayName}</p>
            <p className="profile-page__user-email">{userProfile?.email ?? currentUser?.email}</p>
          </div>
        </div>

        <div className="profile-page__section">
          <h2 className="profile-page__section-title">Innstillinger</h2>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" radius="md" mb="md">
              {error}
            </Alert>
          )}
          {saved && (
            <Alert icon={<IconCheck size={16} />} color="green" radius="md" mb="md">
              Innstillinger lagret.
            </Alert>
          )}

          <Select
            label="Foretrukket valuta"
            description="Skyldbeløp på delinger vises konvertert til denne valutaen."
            data={currencyOptions}
            value={preferredCurrency}
            onChange={setPreferredCurrency}
            placeholder="Velg valuta"
            clearable
            radius="md"
            mb="lg"
          />

          <Button
            onClick={handleSave}
            loading={saving}
            color="violet"
            radius="md"
          >
            Lagre innstillinger
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
