import React, { createContext, useContext, useState, useCallback } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
});

let globalCurrentTheme: Theme = 'light';

const applyThemeToDOM = (newTheme: Theme) => {
  if (typeof document === 'undefined') return;
  globalCurrentTheme = newTheme;
  const root = document.documentElement;
  root.setAttribute('data-theme', newTheme);
  if (newTheme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    document.body.classList.add('dark');
    document.body.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
    document.body.classList.add('light');
    document.body.classList.remove('dark');
  }
};

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem('boardly_theme') || localStorage.getItem('shs_theme');
    if (saved === 'dark' || saved === 'light') {
      applyThemeToDOM(saved);
      return saved;
    }
  } catch {}
  const isDark = Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const defaultTheme: Theme = isDark ? 'dark' : 'light';
  applyThemeToDOM(defaultTheme);
  return defaultTheme;
};

// Initialize theme synchronously on load
if (typeof window !== 'undefined') {
  getInitialTheme();
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => getInitialTheme());

  const setTheme = useCallback((t: Theme) => {
    // 1. Instant DOM modification
    applyThemeToDOM(t);

    // 2. Non-blocking storage save
    setTimeout(() => {
      try {
        localStorage.setItem('boardly_theme', t);
        localStorage.setItem('shs_theme', t);
      } catch {}
    }, 0);

    // 3. Deferred React state update for UI icon refresh
    React.startTransition(() => {
      setThemeState(t);
    });
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme: Theme = globalCurrentTheme === 'dark' ? 'light' : 'dark';
    
    // 1. Instant DOM modification (0ms latency repaint)
    applyThemeToDOM(nextTheme);

    // 2. Non-blocking storage save
    setTimeout(() => {
      try {
        localStorage.setItem('boardly_theme', nextTheme);
        localStorage.setItem('shs_theme', nextTheme);
      } catch {}
    }, 0);

    // 3. Deferred React state update for UI icon refresh
    React.startTransition(() => {
      setThemeState(nextTheme);
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

