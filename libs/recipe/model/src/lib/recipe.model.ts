export interface RecipeIngredient {
  readonly name: string;
  readonly quantity: string;
  readonly unit: string;
}

export type RecipeIngredientValue = RecipeIngredient | string;

const EMPTY_INGREDIENT: RecipeIngredient = {
  name: '',
  quantity: '',
  unit: '',
};

export function normalizeRecipeIngredient(
  ingredient: RecipeIngredientValue,
): RecipeIngredient {
  if (typeof ingredient === 'string') {
    return {
      ...EMPTY_INGREDIENT,
      name: ingredient.trim(),
    };
  }

  return {
    name: ingredient.name.trim(),
    quantity: ingredient.quantity.trim(),
    unit: ingredient.unit.trim(),
  };
}

export function normalizeRecipeIngredients(
  ingredients: readonly RecipeIngredientValue[],
): RecipeIngredient[] {
  return ingredients.map(normalizeRecipeIngredient);
}

export function formatRecipeIngredient(ingredient: RecipeIngredient): string {
  return [ingredient.quantity, ingredient.unit, ingredient.name]
    .filter(Boolean)
    .join(' ');
}

export class Recipe {
  constructor(
    readonly id: string,
    readonly title: string,
    readonly ingredients: RecipeIngredient[],
    readonly instructions: string[],
  ) {}
}
