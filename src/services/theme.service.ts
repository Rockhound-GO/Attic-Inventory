import { Injectable, signal, effect, OnDestroy } from '@angular/core';

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'inventory-app-theme';

@Injectable({
  providedIn: 'root',
})
export class ThemeService implements OnDestroy {
  theme = signal<Theme>('light');

  private mediaQuery: MediaQueryList | null = null;
  private readonly mediaQueryListener = (e: MediaQueryListEvent) => {
    // This listener is only active if the user hasn't made an explicit choice.
    // It updates the theme based on the system's preference.
    this.theme.set(e.matches ? 'dark' : 'light');
  };

  constructor() {
    this.initializeTheme();

    // This effect runs whenever the theme signal changes, applying the
    // correct class to the document's root element.
    effect(() => {
      const currentTheme = this.theme();
      if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });
  }
  
  ngOnDestroy() {
    if (this.mediaQuery) {
      this.mediaQuery.removeEventListener('change', this.mediaQueryListener);
    }
  }

  private getStoredTheme(): Theme | null {
    try {
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme === 'dark' || storedTheme === 'light') {
        return storedTheme;
      }
    } catch (e) {
      console.error('Failed to read theme from localStorage', e);
    }
    return null;
  }

  private initializeTheme(): void {
    const storedTheme = this.getStoredTheme();
    if (storedTheme) {
      // If a theme is stored, use it and we're done.
      this.theme.set(storedTheme);
    } else {
      // If no theme is stored, use system preference and listen for changes.
      if (window.matchMedia) {
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.theme.set(this.mediaQuery.matches ? 'dark' : 'light');
        this.mediaQuery.addEventListener('change', this.mediaQueryListener);
      }
    }
  }

  toggleTheme(): void {
    this.theme.update(current => {
      const newTheme = current === 'light' ? 'dark' : 'light';
      try {
        // When user toggles, we persist their choice to override system preference.
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
        // If we were listening to system changes, we stop now since the user
        // has made an explicit choice.
        if (this.mediaQuery) {
          this.mediaQuery.removeEventListener('change', this.mediaQueryListener);
          this.mediaQuery = null;
        }
      } catch (e) {
        console.error('Failed to save theme to localStorage', e);
      }
      return newTheme;
    });
  }
}
