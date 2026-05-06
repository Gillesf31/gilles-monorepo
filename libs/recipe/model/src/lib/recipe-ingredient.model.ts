export interface RecipeIngredient {
  readonly name: string;
  readonly quantity: string;
  readonly unit: string;
}

export type RecipeIngredientValue = RecipeIngredient | string;
