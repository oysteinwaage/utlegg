import { useState, useEffect } from 'react';
import { Badge, Loader, Center, Avatar, Menu, ActionIcon, Tooltip } from '@mantine/core';
import {
  IconUsers, IconShieldCheck, IconUser, IconFlask, IconPlus, IconX,
} from '@tabler/icons-react';
import { ref, get, update } from 'firebase/database';
import { database } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/AppLayout';
import { formatShortDate, getInitials } from '../utils/formatUtils';

const ALL_ROLES = ['ADMIN', 'BRUKER', 'TEST_USER'];

const ROLE_META = {
  ADMIN:     { color: 'violet', icon: <IconShieldCheck size={11} /> },
  BRUKER:    { color: 'blue',   icon: <IconUser size={11} /> },
  TEST_USER: { color: 'orange', icon: <IconFlask size={11} /> },
};

export default function AdminPage() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    get(ref(database, 'users'))
      .then((snap) => {
        if (!snap.exists()) { setUsers([]); return; }
        const list = Object.entries(snap.val()).map(([uid, data]) => ({ uid, ...data }));
        list.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
        setUsers(list);
      })
      .finally(() => setLoading(false));
  }, []);

  async function saveRoles(uid, newRoles) {
    setUpdating(uid);
    try {
      await update(ref(database, `users/${uid}`), { roles: newRoles });
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, roles: newRoles } : u)));
    } finally {
      setUpdating(null);
    }
  }

  function handleRemove(uid, role) {
    const user = users.find((u) => u.uid === uid);
    const current = user.roles ?? ['BRUKER'];
    if (current.length <= 1) return; // aldri fjern siste rolle
    saveRoles(uid, current.filter((r) => r !== role));
  }

  function handleAdd(uid, role) {
    const user = users.find((u) => u.uid === uid);
    const current = user.roles ?? ['BRUKER'];
    if (current.includes(role)) return;
    saveRoles(uid, [...current, role]);
  }

  const totalCount   = users.length;
  const adminCount   = users.filter((u) => u.roles?.includes('ADMIN')).length;
  const testCount    = users.filter((u) => u.roles?.includes('TEST_USER')).length;
  const regularCount = users.filter((u) => !u.roles?.includes('ADMIN') && !u.roles?.includes('TEST_USER')).length;

  if (loading) {
    return (
      <AppLayout>
        <Center h={300}><Loader color="violet" /></Center>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="admin-page">
        <div className="admin-page__header">
          <h1 className="admin-page__title">Brukere</h1>
          <p className="admin-page__subtitle">{totalCount} registrerte brukere</p>
        </div>

        <div className="admin-stats">
          <div className="admin-stats__card">
            <IconUsers size={20} />
            <span className="admin-stats__value">{totalCount}</span>
            <span className="admin-stats__label">Totalt</span>
          </div>
          <div className="admin-stats__card admin-stats__card--violet">
            <IconShieldCheck size={20} />
            <span className="admin-stats__value">{adminCount}</span>
            <span className="admin-stats__label">Admin</span>
          </div>
          <div className="admin-stats__card admin-stats__card--blue">
            <IconUser size={20} />
            <span className="admin-stats__value">{regularCount}</span>
            <span className="admin-stats__label">Brukere</span>
          </div>
          <div className="admin-stats__card admin-stats__card--orange">
            <IconFlask size={20} />
            <span className="admin-stats__value">{testCount}</span>
            <span className="admin-stats__label">Test</span>
          </div>
        </div>

        <div className="admin-user-list">
          {users.map((user) => {
            const roles = user.roles ?? ['BRUKER'];
            const available = ALL_ROLES.filter((r) => !roles.includes(r));
            const isSelf = user.uid === currentUser.uid;
            const isBusy = updating === user.uid;

            return (
              <div key={user.uid} className={`admin-user-row${isBusy ? ' admin-user-row--busy' : ''}`}>
                <div className="admin-user-row__avatar">
                  {user.photoURL ? (
                    <Avatar src={user.photoURL} size={40} radius="xl" />
                  ) : (
                    <Avatar size={40} radius="xl" color="violet">
                      {getInitials(user.name)}
                    </Avatar>
                  )}
                </div>

                <div className="admin-user-row__info">
                  <span className="admin-user-row__name">
                    {user.name}
                    {isSelf && <span className="admin-user-row__you">deg</span>}
                  </span>
                  <span className="admin-user-row__email">{user.email}</span>
                </div>

                <div className="admin-user-row__roles">
                  {roles.map((role) => {
                    const meta = ROLE_META[role] ?? { color: 'gray', icon: null };
                    const canRemove = !(isSelf && role === 'ADMIN') && roles.length > 1;
                    return (
                      <Badge
                        key={role}
                        color={meta.color}
                        variant="light"
                        size="sm"
                        radius="sm"
                        leftSection={meta.icon}
                        rightSection={
                          canRemove ? (
                            <ActionIcon
                              size={14}
                              variant="transparent"
                              color={meta.color}
                              onClick={() => handleRemove(user.uid, role)}
                              aria-label={`Fjern rolle ${role}`}
                            >
                              <IconX size={10} />
                            </ActionIcon>
                          ) : null
                        }
                      >
                        {role}
                      </Badge>
                    );
                  })}

                  {available.length > 0 && (
                    <Menu shadow="md" position="bottom-start" withinPortal>
                      <Menu.Target>
                        <Tooltip label="Legg til rolle" position="top" withArrow>
                          <ActionIcon
                            size={22}
                            variant="light"
                            color="gray"
                            radius="sm"
                            aria-label="Legg til rolle"
                          >
                            <IconPlus size={12} />
                          </ActionIcon>
                        </Tooltip>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Label>Legg til rolle</Menu.Label>
                        {available.map((role) => {
                          const meta = ROLE_META[role] ?? { color: 'gray', icon: null };
                          return (
                            <Menu.Item
                              key={role}
                              leftSection={meta.icon}
                              onClick={() => handleAdd(user.uid, role)}
                            >
                              {role}
                            </Menu.Item>
                          );
                        })}
                      </Menu.Dropdown>
                    </Menu>
                  )}
                </div>

                <div className="admin-user-row__meta">
                  Registrert {formatShortDate(user.createdAt)}
                </div>
              </div>
            );
          })}

          {users.length === 0 && (
            <p className="admin-page__empty">Ingen brukere funnet.</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
