import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { BtnComponent } from '@gilles-monorepo/recipe-ui';

export interface EditableIngredient {
  name: string;
  quantity: string;
  unit: string;
}

const DEFAULT_UNITS = [
  '',
  'g',
  'kg',
  'ml',
  'l',
  'c. à café',
  'c. à soupe',
  'tasse',
  'pincée',
  'pièce',
];

const EMPTY_INGREDIENT: EditableIngredient = {
  name: '',
  quantity: '',
  unit: '',
};

@Component({
  selector: 'gilles-monorepo-ingredient-editor',
  imports: [BtnComponent],
  templateUrl: './ingredient-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngredientEditorComponent {
  readonly ingredients = input<EditableIngredient[]>([{ ...EMPTY_INGREDIENT }]);
  readonly units = input<string[]>(DEFAULT_UNITS);
  readonly addLabel = input('Ajouter un ingrédient');
  readonly removeLabel = input("Supprimer l'ingrédient");
  readonly ingredientsChange = output<EditableIngredient[]>();

  protected addIngredient(): void {
    this.ingredientsChange.emit([
      ...this.ingredients(),
      { ...EMPTY_INGREDIENT },
    ]);
  }

  protected removeIngredient(index: number): void {
    const ingredients = this.ingredients();
    if (ingredients.length <= 1) {
      return;
    }

    this.ingredientsChange.emit(ingredients.filter((_, i) => i !== index));
  }

  protected updateIngredient(
    index: number,
    field: keyof EditableIngredient,
    event: Event,
  ): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    const next = this.ingredients().map((ingredient, i) =>
      i === index ? { ...ingredient, [field]: value } : ingredient,
    );

    this.ingredientsChange.emit(next);
  }

  protected trackByIndex(index: number): number {
    return index;
  }
}
