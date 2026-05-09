import { ThemeService } from './theme.service';

describe(ThemeService.name, () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the saved theme preference on init', () => {
    localStorage.setItem('theme', 'dark');

    const service = new ThemeService();
    service.init();

    expect(service.isDark()).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('persists the next theme when toggled', () => {
    const service = new ThemeService();
    service.init();

    service.toggle();

    expect(service.isDark()).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});
