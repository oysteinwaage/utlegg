import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Loader, Center } from '@mantine/core';
import { IconPlus, IconLayoutGrid } from '@tabler/icons-react';
import { ref, get, remove } from 'firebase/database';
import { database } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/AppLayout';
import SharingCard from '../components/sharing/SharingCard';
import CreateSharingModal from '../components/sharing/CreateSharingModal';

export default function OverviewPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [sharings, setSharings] = useState([]);
  const [participantProfiles, setParticipantProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  async function loadSharings() {
    setLoading(true);
    try {
      const userSharingsSnap = await get(ref(database, `userSharings/${currentUser.uid}`));
      if (!userSharingsSnap.exists()) {
        setSharings([]);
        setLoading(false);
        return;
      }

      const sharingIds = Object.keys(userSharingsSnap.val());
      const sharingSnaps = await Promise.all(
        sharingIds.map((id) => get(ref(database, `sharings/${id}`)))
      );

      const loadedSharings = sharingSnaps
        .filter((s) => s.exists())
        .map((s) => ({ id: s.key, ...s.val() }))
        .sort((a, b) => b.createdAt - a.createdAt);

      setSharings(loadedSharings);

      // Load all participant profiles
      const allUids = new Set();
      loadedSharings.forEach((s) => {
        if (s.participants) Object.keys(s.participants).forEach((uid) => allUids.add(uid));
      });

      const profileSnaps = await Promise.all(
        [...allUids].map((uid) => get(ref(database, `users/${uid}`)))
      );
      const profiles = {};
      profileSnaps.forEach((snap) => {
        if (snap.exists()) profiles[snap.key] = snap.val();
      });
      setParticipantProfiles(profiles);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSharings();
  }, [currentUser.uid]);

  function handleCreated(newId) {
    navigate(`/sharing/${newId}`);
  }

  async function handleDelete(sharing) {
    const participantIds = Object.keys(sharing.participants || {});
    await remove(ref(database, `sharings/${sharing.id}`));
    await Promise.all(
      participantIds.map((uid) => remove(ref(database, `userSharings/${uid}/${sharing.id}`)))
    );
    setSharings((prev) => prev.filter((s) => s.id !== sharing.id));
  }

  if (loading) {
    return (
      <AppLayout>
        <Center h={300}>
          <Loader color="violet" />
        </Center>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="overview-page">
        <div className="overview-page__header">
          <div>
            <h1 className="overview-page__title">Mine delinger</h1>
            <p className="overview-page__subtitle">
              {sharings.length === 0
                ? 'Du har ingen delinger ennå.'
                : `${sharings.filter((s) => s.isActive).length} aktive · ${sharings.filter((s) => !s.isActive).length} avsluttede`}
            </p>
          </div>
          <Button
            leftSection={<IconPlus size={16} />}
            radius="md"
            color="violet"
            onClick={() => setCreateOpen(true)}
          >
            Ny deling
          </Button>
        </div>

        {sharings.length === 0 ? (
          <div className="overview-page__empty">
            <IconLayoutGrid size={40} color="#9B8AFB" />
            <h3>Ingen delinger ennå</h3>
            <p>Opprett din første deling for å begynne å dele utgifter.</p>
          </div>
        ) : (
          <div className="overview-page__grid">
            {sharings.map((sharing) => (
              <SharingCard
                key={sharing.id}
                sharing={sharing}
                participantProfiles={participantProfiles}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <CreateSharingModal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </AppLayout>
  );
}
