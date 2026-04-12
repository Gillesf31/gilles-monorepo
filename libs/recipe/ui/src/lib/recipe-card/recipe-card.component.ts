import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Recipe } from '@gilles-monorepo/recipe-model';

@Component({
  selector: 'gilles-monorepo-recipe-card',
  templateUrl: './recipe-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeCardComponent {
  protected readonly maxVisibleIngredients = 4;

  readonly recipe = input.required<Recipe>();
  readonly deleted = output<void>();
  readonly selected = output<void>();
}
