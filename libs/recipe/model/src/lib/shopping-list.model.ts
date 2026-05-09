import type { Recipe } from './recipe.model';

export interface ShoppingListRecipeSelection {
  readonly recipe: Recipe;
  readonly multiplier: number;
}

export interface ShoppingListItem {
  readonly id: string;
  readonly name: string;
  readonly quantity: string;
  readonly unit: string;
  readonly recipeTitles: readonly string[];
}

export interface ShoppingListState {
  readonly selectedRecipeIds: readonly string[];
  readonly multipliersByRecipeId: Record<string, number>;
  readonly checkedItemIds: readonly string[];
  readonly customItems: readonly ShoppingListItem[];
}
