import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from './theme.service';

@Component({
  selector: 'gilles-monorepo-theme-toggle',
  template: `
    <button
      (click)="themeService.toggle()"
      [attr.aria-label]="themeService.isDark() ? 'Passer au thème clair' : 'Passer au thème sombre'"
      class="fixed bottom-5 right-5 z-50 w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    >
      @if (themeService.isDark()) {
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
        </svg>
      } @else {
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
        </svg>
      }
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggleComponent {
  readonly themeService = inject(ThemeService);
}
