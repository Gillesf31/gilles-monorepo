import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
} from '@angular/cdk/drag-drop';
import {
  formatRecipeIngredient,
  type RecipeIngredient,
} from '@gilles-monorepo/recipe-model';

@Component({
  selector: 'gilles-monorepo-ingredient-list',
  imports: [CdkDropList, CdkDrag, CdkDragHandle],
  templateUrl: './ingredient-list.component.html',
  styles: `
    .cdk-drag-preview {
      border-radius: 0.75rem;
      box-shadow: 0 18px 35px rgb(15 23 42 / 0.18);
      background: rgb(255 255 255);
    }

    :host-context(.dark) .cdk-drag-preview {
      background: rgb(31 41 55);
    }

    .cdk-drag-placeholder {
      opacity: 0.24;
    }

    .cdk-drag-animating,
    .ingredient-drop-list.cdk-drop-list-dragging
      .ingredient-row:not(.cdk-drag-placeholder) {
      transition: transform 180ms cubic-bezier(0.2, 0, 0, 1);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngredientListComponent {
  readonly ingredients = input.required<RecipeIngredient[]>();
  readonly reorderable = input(false);
  readonly resetDelay = input<number>(600);
  readonly allChecked = output<void>();
  readonly ingredientMoved = output<{
    previousIndex: number;
    currentIndex: number;
  }>();

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

  protected formatIngredient(ingredient: RecipeIngredient): string {
    return formatRecipeIngredient(ingredient);
  }

  protected drop(event: CdkDragDrop<RecipeIngredient[]>): void {
    if (!this.reorderable() || event.previousIndex === event.currentIndex) {
      return;
    }

    this.checked.update((set) => {
      const next = new Set<number>();
      for (const index of set) {
        next.add(
          this.moveIndex(index, event.previousIndex, event.currentIndex),
        );
      }
      return next;
    });

    this.ingredientMoved.emit({
      previousIndex: event.previousIndex,
      currentIndex: event.currentIndex,
    });
  }

  private moveIndex(
    index: number,
    previousIndex: number,
    currentIndex: number,
  ): number {
    if (index === previousIndex) {
      return currentIndex;
    }

    if (
      previousIndex < currentIndex &&
      index > previousIndex &&
      index <= currentIndex
    ) {
      return index - 1;
    }

    if (
      previousIndex > currentIndex &&
      index >= currentIndex &&
      index < previousIndex
    ) {
      return index + 1;
    }

    return index;
  }
}
