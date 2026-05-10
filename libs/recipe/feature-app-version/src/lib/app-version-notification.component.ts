import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppVersionService } from './app-version.provider';

@Component({
  selector: 'gilles-monorepo-app-version-notification',
  template: `
    @if (appVersion.updateAvailable()) {
      <aside
        class="fixed inset-x-3 bottom-4 z-40 mx-auto max-w-md rounded-2xl border border-zinc-200 bg-white/95 p-3 shadow-xl shadow-zinc-950/10 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 dark:shadow-black/30"
        role="status"
        aria-live="polite"
      >
        <div class="flex items-start gap-3">
          <div
            class="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
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
            <p class="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              Nouvelle version disponible
            </p>
            <p
              class="mt-0.5 text-sm leading-5 text-zinc-600 dark:text-zinc-300"
            >
              Rechargez l'application pour utiliser la dernière version.
            </p>
            <div class="mt-3 flex items-center gap-2">
              <button
                type="button"
                class="rounded-full bg-zinc-950 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:bg-emerald-400 dark:text-zinc-950 dark:hover:bg-emerald-300 dark:focus:ring-offset-zinc-900"
                (click)="appVersion.updateNow()"
              >
                Mettre à jour
              </button>
              <button
                type="button"
                class="rounded-full px-3 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:focus:ring-offset-zinc-900"
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
