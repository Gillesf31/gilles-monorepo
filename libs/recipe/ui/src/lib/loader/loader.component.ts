import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'gilles-monorepo-loader',
  template: `
    <div class="flex justify-center items-center py-16">
      <div
        class="w-10 h-10 border-4 border-zinc-200 border-t-emerald-500 rounded-full animate-spin dark:border-zinc-800 dark:border-t-emerald-300"
      ></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoaderComponent {}
