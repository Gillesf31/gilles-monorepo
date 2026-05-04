import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BtnVariant = 'primary' | 'secondary' | 'danger' | 'danger-filled' | 'ghost' | 'remove';
export type BtnSize = 'sm' | 'md' | 'lg';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[gillesMonorepoBtn]',
  template: `<ng-content />`,
  host: { '[class]': 'classes()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BtnComponent {
  readonly variant = input<BtnVariant>('primary');
  readonly size = input<BtnSize>('md');

  protected readonly classes = computed(() => {
    const variant = this.variant();

    const variantClasses: Record<BtnVariant, string> = {
      primary:
        'rounded-full bg-zinc-950 text-white shadow-sm shadow-zinc-950/10 hover:bg-emerald-700 dark:bg-emerald-400 dark:text-zinc-950 dark:hover:bg-emerald-300 font-semibold transition-colors',
      secondary:
        'rounded-full border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 font-medium transition-colors',
      danger:
        'rounded-full border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 dark:border-rose-900/70 dark:bg-zinc-900 dark:text-rose-300 dark:hover:bg-rose-950/50 font-medium transition-colors',
      'danger-filled':
        'rounded-full bg-rose-600 hover:bg-rose-700 text-white font-medium transition-colors',
      ghost:
        'rounded-full text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/50 font-medium transition-colors',
      remove:
        'rounded-full p-2 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-500 dark:hover:bg-rose-950/50 dark:hover:text-rose-300 transition-colors',
    };

    const sizeClasses: Record<BtnSize, string> = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-3 text-sm',
    };

    // remove has its own fixed padding
    const sizing = variant === 'remove' ? '' : sizeClasses[this.size()];

    return `${variantClasses[variant]} ${sizing}`.trim();
  });
}
