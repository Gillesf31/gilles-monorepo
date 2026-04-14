import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'gilles-monorepo-confirm-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        class="absolute inset-0 bg-black/50 dark:bg-black/70"
        (click)="cancelled.emit()"
        (keydown.escape)="cancelled.emit()"
        tabindex="0"
        role="button"
        aria-label="Fermer"
      ></div>
      <div
        class="relative z-10 w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 shadow-xl p-6 flex flex-col gap-4"
      >
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-50">
          {{ title() }}
        </h2>
        <p class="text-gray-500 dark:text-gray-400 text-sm">{{ message() }}</p>
        <div class="flex gap-3 justify-end">
          <button
            type="button"
            (click)="cancelled.emit()"
            class="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium transition-colors"
          >
            {{ cancelLabel() }}
          </button>
          <button
            type="button"
            (click)="confirmed.emit()"
            class="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
          >
            {{ confirmLabel() }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmModalComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirmer');
  readonly cancelLabel = input('Annuler');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
