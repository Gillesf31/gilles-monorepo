import { ThemeService } from './theme.service';

describe(ThemeService.name, () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('uses the saved theme preference on init', () => {
    localStorage.setItem('theme', 'dark');

    const service = new ThemeService();
    service.init();

    expect(service.isDark()).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('defaults to dark when no preference is saved', () => {
    const service = new ThemeService();
    service.init();

    expect(service.isDark()).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('restores a saved light preference', () => {
    localStorage.setItem('theme', 'light');

    const service = new ThemeService();
    service.init();

    expect(service.isDark()).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('persists a light preference when the default theme is toggled', () => {
    const service = new ThemeService();
    service.init();

    service.toggle();

    expect(service.isDark()).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
