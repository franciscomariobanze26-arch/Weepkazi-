import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  theme: 'blue' | 'yellow';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'blue' | 'yellow'>('blue');

  const toggleTheme = () => {
    setTheme(prev => prev === 'blue' ? 'yellow' : 'blue');
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'yellow') {
      root.style.setProperty('--primary', '#EAB308'); // yellow-600
      root.style.setProperty('--primary-foreground', '#000000');
    } else {
      root.style.setProperty('--primary', '#2563EB'); // blue-600
      root.style.setProperty('--primary-foreground', '#FFFFFF');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
