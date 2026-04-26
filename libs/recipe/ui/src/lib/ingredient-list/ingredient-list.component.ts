import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
} from '@angular/core';

@Component({
  selector: 'gilles-monorepo-ingredient-list',
  templateUrl: './ingredient-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngredientListComponent {
  readonly ingredients = input.required<string[]>();
  readonly resetDelay = input<number>(600);
  readonly allChecked = output<void>();

  protected readonly checked = signal<Set<number>>(new Set());

  constructor() {
    effect(() => {
      const list = this.ingredients();
      const c = this.checked();
      if (list.length > 0 && c.size === list.length) {
        setTimeout(() => {
          this.checked.set(new Set());
          this.allChecked.emit();
        }, this.resetDelay());
      }
    });
  }

  protected toggle(index: number): void {
    this.checked.update((set) => {
      const next = new Set(set);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  protected isChecked(index: number): boolean {
    return this.checked().has(index);
  }
}
