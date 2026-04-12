import { signal } from '@angular/core';

const STORAGE_KEY = 'theme';

export class ThemeService {
  readonly isDark = signal(false);

  init(): void {
    const saved = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.apply(saved ? saved === 'dark' : prefersDark);
  }

  toggle(): void {
    this.apply(!this.isDark());
  }

  private apply(dark: boolean): void {
    this.isDark.set(dark);
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
  }
}
