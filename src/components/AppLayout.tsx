import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Avatar, ActionIcon } from '@mantine/core';
import { IconLogout, IconLayoutGrid, IconReceipt2, IconShieldCheck } from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';
import { getInitials } from '../utils/formatUtils';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { currentUser, userProfile, logout } = useAuth();
  const isAdmin = userProfile?.roles?.includes('ADMIN');

  return (
    <>
      <header className="app-header">
        <Link to="/" className="app-header__brand">
          <div className="app-header__brand-icon">
            <IconReceipt2 size={18} />
          </div>
          Utlegg
        </Link>

        <div className="app-header__user">
          <span className="app-header__user-name">{currentUser?.displayName}</span>
          <Menu shadow="md" width={180} position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="subtle" radius="xl" size="lg" style={{ cursor: 'pointer' }}>
                {currentUser?.photoURL ? (
                  <Avatar src={currentUser.photoURL} size={32} radius="xl" />
                ) : (
                  <Avatar size={32} radius="xl" color="violet">
                    {getInitials(currentUser?.displayName)}
                  </Avatar>
                )}
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item component={Link} to="/overview" leftSection={<IconLayoutGrid size={14} />}>
                Oversikt
              </Menu.Item>
              {isAdmin && (
                <>
                  <Menu.Divider />
                  <Menu.Item component={Link} to="/admin" leftSection={<IconShieldCheck size={14} />}>
                    Admin
                  </Menu.Item>
                </>
              )}
              <Menu.Divider />
              <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={logout}>
                Logg ut
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </div>
      </header>

      <main className="app-main">{children}</main>
    </>
  );
}
