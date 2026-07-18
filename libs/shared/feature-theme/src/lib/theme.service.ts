import { signal } from '@angular/core';

const STORAGE_KEY = 'theme';
const DARK_THEME_COLOR = '#111827';
const LIGHT_THEME_COLOR = '#f9fafb';

export class ThemeService {
  readonly isDark = signal(true);

  init(): void {
    const saved = localStorage.getItem(STORAGE_KEY);
    this.apply(saved ? saved === 'dark' : true);
  }

  toggle(): void {
    this.apply(!this.isDark());
  }

  private apply(dark: boolean): void {
    this.isDark.set(dark);
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
  }
}
