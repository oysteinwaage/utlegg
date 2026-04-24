import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal, Button, Stack, Text } from '@mantine/core';
import { IconCircleCheck, IconCircleDashed, IconTrash, IconAlertTriangle } from '@tabler/icons-react';
import { getInitials, formatShortDate } from '../../utils/formatUtils';
import { getCurrencyLabel } from '../../services/currencyService';

export default function SharingCard({ sharing, participantProfiles = {}, onDelete }) {
  const isActive = sharing.isActive;
  const participantIds = sharing.participants ? Object.keys(sharing.participants) : [];
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteConfirm() {
    setDeleting(true);
    try {
      await onDelete(sharing);
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <div className={`sharing-card-wrapper${isActive ? '' : ' sharing-card-wrapper--closed'}`}>
        <Link
          to={`/sharing/${sharing.id}`}
          className={`sharing-card${isActive ? '' : ' sharing-card--closed'}`}
        >
          <h3 className="sharing-card__name">{sharing.name}</h3>

          <div className="sharing-card__meta">
            <span>{getCurrencyLabel(sharing.defaultCurrency)}</span>
            <span>·</span>
            <span>Opprettet {formatShortDate(sharing.createdAt)}</span>
          </div>

          <div className="sharing-card__participants">
            {participantIds.map((uid) => {
              const profile = participantProfiles[uid];
              return (
                <div key={uid} className="sharing-card__participant-avatar" title={profile?.name}>
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} alt={profile.name} />
                  ) : (
                    getInitials(profile?.name)
                  )}
                </div>
              );
            })}
          </div>

          <div className="sharing-card__footer">
            {isActive ? (
              <span className="sharing-card__status sharing-card__status--active">
                <IconCircleCheck size={12} />
                Aktiv
              </span>
            ) : (
              <span className="sharing-card__status sharing-card__status--closed">
                <IconCircleDashed size={12} />
                Avsluttet
              </span>
            )}
          </div>
        </Link>

        {!isActive && (
          <button
            className="sharing-card__delete-btn"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmOpen(true); }}
            title="Slett deling"
            aria-label="Slett deling"
          >
            <IconTrash size={14} />
          </button>
        )}
      </div>

      <Modal
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
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
          <Button color="red" radius="md" loading={deleting} onClick={handleDeleteConfirm} leftSection={<IconTrash size={16} />}>
            Ja, slett delingen
          </Button>
          <Button variant="subtle" radius="md" onClick={() => setConfirmOpen(false)}>
            Avbryt
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
