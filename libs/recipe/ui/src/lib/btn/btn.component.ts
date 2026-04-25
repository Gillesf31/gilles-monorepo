import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BtnVariant = 'primary' | 'secondary' | 'danger' | 'danger-filled' | 'ghost' | 'remove';
export type BtnSize = 'sm' | 'md' | 'lg';

@Component({
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
        'rounded-lg bg-amber-500 dark:bg-amber-600 hover:bg-amber-600 dark:hover:bg-amber-500 text-white font-semibold transition-colors',
      secondary:
        'rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors',
      danger:
        'rounded-lg border border-red-200 dark:border-red-900 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 font-medium transition-colors',
      'danger-filled':
        'rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors',
      ghost:
        'rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 font-medium transition-colors',
      remove:
        'rounded-lg p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-30 disabled:cursor-not-allowed transition-colors',
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
