'use client';

import React from 'react';
import { I18nProvider } from '../lib/i18n';
import { AppProvider } from '../context/AppContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AppProvider>
        {children}
      </AppProvider>
    </I18nProvider>
  );
}
