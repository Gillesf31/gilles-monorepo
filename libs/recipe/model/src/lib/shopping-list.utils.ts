import { scaleRecipeIngredient } from './recipe-ingredient.utils';
import type {
  ShoppingListItem,
  ShoppingListRecipeSelection,
} from './shopping-list.model';

const DECIMAL_QUANTITY_PATTERN = /^\d+(?:[.,]\d+)?$/;
const FRACTION_QUANTITY_PATTERN = /^(\d+)\s*\/\s*(\d+)$/;
const MAX_DECIMAL_PLACES = 6;

interface ShoppingListAccumulator {
  readonly id: string;
  readonly name: string;
  readonly unit: string;
  readonly decimalSeparator: ',' | '.';
  quantity: number | null;
  readonly recipeTitles: Set<string>;
}

export function createShoppingListItems(
  selections: readonly ShoppingListRecipeSelection[],
): ShoppingListItem[] {
  const mergedItems = new Map<string, ShoppingListAccumulator>();
  const standaloneItems: ShoppingListItem[] = [];

  selections.forEach(({ recipe, multiplier }) => {
    recipe.ingredients.forEach((ingredient, index) => {
      const scaledIngredient = scaleRecipeIngredient(ingredient, multiplier);
      const name = scaledIngredient.name.trim();
      const unit = scaledIngredient.unit.trim();
      const quantity = scaledIngredient.quantity.trim();

      if (!name) {
        return;
      }

      const parsedQuantity = parseQuantity(quantity);
      if (quantity && !parsedQuantity) {
        standaloneItems.push({
          id: `${recipe.id}-${index}`,
          name,
          quantity,
          unit,
          recipeTitles: [recipe.title],
        });
        return;
      }

      const key = createMergeKey(name, unit);
      const existingItem = mergedItems.get(key);

      if (existingItem) {
        existingItem.quantity =
          existingItem.quantity === null || parsedQuantity === null
            ? null
            : existingItem.quantity + parsedQuantity.value;
        existingItem.recipeTitles.add(recipe.title);
        return;
      }

      mergedItems.set(key, {
        id: key,
        name,
        unit,
        decimalSeparator: parsedQuantity?.decimalSeparator ?? '.',
        quantity: parsedQuantity?.value ?? null,
        recipeTitles: new Set([recipe.title]),
      });
    });
  });

  return [
    ...Array.from(mergedItems.values()).map(toShoppingListItem),
    ...standaloneItems,
  ].sort(compareShoppingListItems);
}

function toShoppingListItem(item: ShoppingListAccumulator): ShoppingListItem {
  return {
    id: item.id,
    name: item.name,
    quantity:
      item.quantity === null
        ? ''
        : formatQuantity(item.quantity, item.decimalSeparator),
    unit: item.unit,
    recipeTitles: Array.from(item.recipeTitles).sort((a, b) =>
      a.localeCompare(b, 'fr'),
    ),
  };
}

function createMergeKey(name: string, unit: string): string {
  return `${normalizeKey(name)}::${normalizeKey(unit)}`;
}

function normalizeKey(value: string): string {
  return value.trim().toLocaleLowerCase('fr');
}

function compareShoppingListItems(
  itemA: ShoppingListItem,
  itemB: ShoppingListItem,
): number {
  return (
    itemA.name.localeCompare(itemB.name, 'fr') ||
    itemA.unit.localeCompare(itemB.unit, 'fr') ||
    itemA.quantity.localeCompare(itemB.quantity, 'fr')
  );
}

function parseQuantity(
  quantity: string,
): { value: number; decimalSeparator: ',' | '.' } | null {
  if (!quantity) {
    return null;
  }

  if (DECIMAL_QUANTITY_PATTERN.test(quantity)) {
    const decimalSeparator = quantity.includes(',') ? ',' : '.';
    return {
      value: Number(quantity.replace(',', '.')),
      decimalSeparator,
    };
  }

  const fractionMatch = quantity.match(FRACTION_QUANTITY_PATTERN);
  if (!fractionMatch) {
    return null;
  }

  const numerator = Number(fractionMatch[1]);
  const denominator = Number(fractionMatch[2]);
  if (denominator === 0) {
    return null;
  }

  return {
    value: numerator / denominator,
    decimalSeparator: '.',
  };
}

function formatQuantity(value: number, decimalSeparator: ',' | '.'): string {
  const factor = 10 ** MAX_DECIMAL_PLACES;
  const roundedValue = Math.round((value + Number.EPSILON) * factor) / factor;
  const formattedValue = roundedValue
    .toFixed(MAX_DECIMAL_PLACES)
    .replace(/\.?0+$/, '');

  return decimalSeparator === ','
    ? formattedValue.replace('.', ',')
    : formattedValue;
}
