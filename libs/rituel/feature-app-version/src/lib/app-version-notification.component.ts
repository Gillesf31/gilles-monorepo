import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppVersionService } from './app-version.provider';

@Component({
  selector: 'gilles-monorepo-rituel-app-version-notification',
  template: `
    @if (appVersion.updateAvailable()) {
      <aside
        class="fixed inset-x-3 bottom-4 z-40 mx-auto max-w-md rounded-2xl border border-stone-200 bg-white/95 p-3 shadow-xl shadow-stone-950/10 backdrop-blur dark:border-stone-700 dark:bg-stone-900/95 dark:shadow-black/30"
        role="status"
        aria-live="polite"
      >
        <div class="flex items-start gap-3">
          <div
            class="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rituel-accent/15 text-rituel-accent dark:bg-rituel-dark-accent/15 dark:text-rituel-dark-accent"
            aria-hidden="true"
          >
            <svg
              class="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
          </div>

          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-rituel-ink dark:text-rituel-dark-ink">
              Nouvelle version disponible
            </p>
            <p class="mt-0.5 text-sm leading-5 text-rituel-muted dark:text-rituel-dark-muted">
              Rechargez l’application pour profiter de la dernière version.
            </p>
            <div class="mt-3 flex items-center gap-2">
              <button
                type="button"
                class="rounded-full bg-rituel-accent px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-rituel-accent/90 focus:outline-none focus:ring-2 focus:ring-rituel-accent focus:ring-offset-2 dark:bg-rituel-dark-accent dark:text-stone-950 dark:hover:bg-rituel-dark-accent/90 dark:focus:ring-offset-stone-900"
                (click)="appVersion.updateNow()"
              >
                Mettre à jour
              </button>
              <button
                type="button"
                class="rounded-full px-3 py-1.5 text-sm font-medium text-rituel-muted transition-colors hover:bg-stone-100 hover:text-rituel-ink focus:outline-none focus:ring-2 focus:ring-stone-300 focus:ring-offset-2 dark:text-rituel-dark-muted dark:hover:bg-stone-800 dark:hover:text-rituel-dark-ink dark:focus:ring-offset-stone-900"
                (click)="appVersion.dismissUpdate()"
              >
                Plus tard
              </button>
            </div>
          </div>
        </div>
      </aside>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppVersionNotificationComponent {
  protected readonly appVersion = inject(AppVersionService);
}
