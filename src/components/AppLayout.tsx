import { type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Avatar, ActionIcon } from '@mantine/core';
import { IconLogout, IconLayoutGrid, IconReceipt2, IconShieldCheck, IconUser } from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';
import { getInitials } from '../utils/formatUtils';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
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
              <Menu.Item leftSection={<IconLayoutGrid size={14} />} onClick={() => navigate('/overview')}>
                Oversikt
              </Menu.Item>
              <Menu.Item leftSection={<IconUser size={14} />} onClick={() => navigate('/profile')}>
                Min side
              </Menu.Item>
              {isAdmin && (
                <>
                  <Menu.Divider />
                  <Menu.Item leftSection={<IconShieldCheck size={14} />} onClick={() => navigate('/admin')}>
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
