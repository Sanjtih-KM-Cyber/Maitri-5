
import React from 'react';

export type Theme = 'light' | 'dark' | 'circadian';

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeContext = React.createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => console.warn('no theme provider'),
});