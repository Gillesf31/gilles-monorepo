import type { RecipeIngredient } from './recipe-ingredient.model';

export class Recipe {
  constructor(
    readonly id: string,
    readonly title: string,
    readonly ingredients: RecipeIngredient[],
    readonly instructions: string[],
    readonly isWorkInProgress = false,
  ) {}
}
