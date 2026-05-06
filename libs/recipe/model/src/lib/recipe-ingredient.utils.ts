import {
  type RecipeIngredient,
  type RecipeIngredientValue,
} from './recipe-ingredient.model';

const EMPTY_INGREDIENT: RecipeIngredient = {
  name: '',
  quantity: '',
  unit: '',
};

const DECIMAL_QUANTITY_PATTERN = /^\d+(?:[.,]\d+)?$/;
const FRACTION_QUANTITY_PATTERN = /^(\d+)\s*\/\s*(\d+)$/;
const MAX_DECIMAL_PLACES = 6;

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

export function hasRecipeIngredientUnits(
  ingredients: readonly RecipeIngredient[],
): boolean {
  return ingredients.some((ingredient) => ingredient.unit.trim());
}

export function scaleRecipeIngredient(
  ingredient: RecipeIngredient,
  multiplier: number,
): RecipeIngredient {
  const quantity = scaleQuantity(ingredient.quantity, multiplier);

  if (quantity === ingredient.quantity) {
    return ingredient;
  }

  return {
    ...ingredient,
    quantity,
  };
}

export function scaleRecipeIngredients(
  ingredients: readonly RecipeIngredient[],
  multiplier: number,
): RecipeIngredient[] {
  return ingredients.map((ingredient) =>
    scaleRecipeIngredient(ingredient, multiplier),
  );
}

function scaleQuantity(quantity: string, multiplier: number): string {
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    return quantity;
  }

  if (multiplier === 1) {
    return quantity;
  }

  const trimmedQuantity = quantity.trim();
  if (!trimmedQuantity) {
    return quantity;
  }

  if (DECIMAL_QUANTITY_PATTERN.test(trimmedQuantity)) {
    const decimalSeparator = trimmedQuantity.includes(',') ? ',' : '.';
    const value = Number(trimmedQuantity.replace(',', '.'));
    return formatScaledNumber(value * multiplier, decimalSeparator);
  }

  const fractionMatch = trimmedQuantity.match(FRACTION_QUANTITY_PATTERN);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (denominator === 0) {
      return quantity;
    }

    return formatScaledNumber((numerator / denominator) * multiplier, '.');
  }

  return quantity;
}

function formatScaledNumber(value: number, decimalSeparator: ',' | '.'): string {
  const factor = 10 ** MAX_DECIMAL_PLACES;
  const roundedValue = Math.round((value + Number.EPSILON) * factor) / factor;
  const formattedValue = roundedValue
    .toFixed(MAX_DECIMAL_PLACES)
    .replace(/\.?0+$/, '');

  return decimalSeparator === ','
    ? formattedValue.replace('.', ',')
    : formattedValue;
}
