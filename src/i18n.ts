import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslations from './locales/en.json';
import thTranslations from './locales/th.json';

const isServer = typeof window === 'undefined';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      th: {
        translation: thTranslations,
      },
    },
    lng: 'th',
    fallbackLng: 'th',
    interpolation: {
      escapeValue: false,
    },
  });

// Only use browser language detector on the client to avoid SSR crashes
if (!isServer) {
  import('i18next-browser-languagedetector').then((mod) => {
    i18n.use(mod.default);
  });
}

export default i18n;
