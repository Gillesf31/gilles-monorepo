import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { BtnComponent } from '../btn/btn.component';

@Component({
  selector: 'gilles-monorepo-confirm-modal',
  imports: [BtnComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        class="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm dark:bg-black/70"
        (click)="cancelled.emit()"
        (keydown.escape)="cancelled.emit()"
        tabindex="0"
        role="button"
        aria-label="Fermer"
      ></div>
      <div
        class="relative z-10 flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl shadow-zinc-950/20 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 class="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          {{ title() }}
        </h2>
        <p class="text-sm leading-6 text-zinc-600 dark:text-zinc-400">{{ message() }}</p>
        <div class="flex gap-3 justify-end">
          <button gillesMonorepoBtn variant="secondary" type="button" (click)="cancelled.emit()">
            {{ cancelLabel() }}
          </button>
          <button gillesMonorepoBtn variant="danger-filled" type="button" (click)="confirmed.emit()">
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
