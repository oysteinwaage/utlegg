import { Link } from 'react-router-dom';
import { IconCircleCheck, IconCircleDashed } from '@tabler/icons-react';
import { getInitials, formatShortDate } from '../../utils/formatUtils';
import { getCurrencyLabel } from '../../services/currencyService';

export default function SharingCard({ sharing, participantProfiles = {} }) {
  const isActive = sharing.isActive;
  const participantIds = sharing.participants ? Object.keys(sharing.participants) : [];

  return (
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
        {participantIds.length === 0 && (
          <span className="text-muted">Ingen deltakere</span>
        )}
      </div>

      <div>
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
  );
}
