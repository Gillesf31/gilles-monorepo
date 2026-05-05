import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  formatRecipeIngredient,
  Recipe,
  type RecipeIngredient,
} from '@gilles-monorepo/recipe-model';
import { BtnComponent } from '../btn/btn.component';

@Component({
  selector: 'gilles-monorepo-recipe-card',
  imports: [BtnComponent],
  templateUrl: './recipe-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeCardComponent {
  protected readonly maxVisibleIngredients = 4;

  readonly recipe = input.required<Recipe>();
  readonly deleted = output<void>();
  readonly selected = output<void>();

  protected formatIngredient(ingredient: RecipeIngredient): string {
    return formatRecipeIngredient(ingredient);
  }
}
