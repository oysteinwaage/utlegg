import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider, createTheme } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import './styles/main.scss';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';

const theme = createTheme({
  primaryColor: 'violet',
  defaultRadius: 'md',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  components: {
    Button:      { defaultProps: { radius: 'md' } },
    Modal:       { defaultProps: { radius: 'lg', overlayProps: { blur: 4 } } },
    Card:        { defaultProps: { radius: 'lg', shadow: 'sm' } },
    TextInput:   { defaultProps: { radius: 'md' } },
    Select:      { defaultProps: { radius: 'md' } },
    NumberInput: { defaultProps: { radius: 'md' } },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <MantineProvider theme={theme}>
        <ModalsProvider>
          <Notifications position="top-right" />
          <AuthProvider>
            <App />
          </AuthProvider>
        </ModalsProvider>
      </MantineProvider>
    </BrowserRouter>
  </StrictMode>,
);
