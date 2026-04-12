import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'gilles-monorepo-loader',
  template: `
    <div class="flex justify-center items-center py-16">
      <div class="w-10 h-10 border-4 border-gray-200 dark:border-gray-700 border-t-amber-500 dark:border-t-amber-400 rounded-full animate-spin"></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoaderComponent {}
