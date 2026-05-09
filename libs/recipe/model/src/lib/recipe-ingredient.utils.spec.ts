import {
  hasRecipeIngredientUnits,
  scaleRecipeIngredient,
  scaleRecipeIngredients,
} from './recipe-ingredient.utils';
import type { RecipeIngredient } from './recipe-ingredient.model';

describe('recipe ingredient scaling', () => {
  it('detects recipes that use ingredient units', () => {
    expect(
      hasRecipeIngredientUnits([
        { quantity: '', unit: '', name: 'sel' },
        { quantity: '200', unit: 'g', name: 'farine' },
      ]),
    ).toBe(true);
    expect(
      hasRecipeIngredientUnits([
        { quantity: '', unit: '', name: 'sel' },
        { quantity: '', unit: '', name: 'poivre' },
      ]),
    ).toBe(false);
  });

  it('scales integer quantities', () => {
    expect(
      scaleRecipeIngredient({ quantity: '200', unit: 'g', name: 'farine' }, 2),
    ).toEqual({ quantity: '400', unit: 'g', name: 'farine' });
  });

  it('scales decimal quantities with dot and comma separators', () => {
    expect(
      scaleRecipeIngredient({ quantity: '1.25', unit: 'l', name: 'lait' }, 2)
        .quantity,
    ).toBe('2.5');
    expect(
      scaleRecipeIngredient({ quantity: '1,25', unit: 'l', name: 'lait' }, 2)
        .quantity,
    ).toBe('2,5');
  });

  it('scales simple fractions', () => {
    expect(
      scaleRecipeIngredient(
        { quantity: '1/2', unit: 'tasse', name: 'sucre' },
        2,
      ),
    ).toEqual({ quantity: '1', unit: 'tasse', name: 'sucre' });
  });

  it('leaves quantities unchanged at the default multiplier', () => {
    expect(
      scaleRecipeIngredient(
        { quantity: '1/2', unit: 'tasse', name: 'sucre' },
        1,
      ),
    ).toEqual({ quantity: '1/2', unit: 'tasse', name: 'sucre' });
  });

  it('leaves quantities unchanged with invalid multipliers', () => {
    const ingredient: RecipeIngredient = {
      quantity: '1/2',
      unit: 'tasse',
      name: 'sucre',
    };

    expect(scaleRecipeIngredient(ingredient, 0)).toBe(ingredient);
    expect(scaleRecipeIngredient(ingredient, Number.NaN)).toBe(ingredient);
  });

  it('leaves fractions with a zero denominator unchanged', () => {
    const ingredient: RecipeIngredient = {
      quantity: '1/0',
      unit: 'tasse',
      name: 'sucre',
    };

    expect(scaleRecipeIngredient(ingredient, 2)).toBe(ingredient);
  });

  it('leaves free text, ranges, mixed quantities, and empty quantities unchanged', () => {
    const ingredients: RecipeIngredient[] = [
      { quantity: 'une pincee', unit: '', name: 'sel' },
      { quantity: '200-250', unit: 'g', name: 'pates' },
      { quantity: '1 1/2', unit: 'tasse', name: 'farine' },
      { quantity: '', unit: '', name: 'poivre' },
    ];

    expect(scaleRecipeIngredients(ingredients, 2)).toEqual(ingredients);
  });

  it('does not mutate original ingredient objects', () => {
    const ingredient: RecipeIngredient = {
      quantity: '200',
      unit: 'g',
      name: 'farine',
    };

    const scaledIngredient = scaleRecipeIngredient(ingredient, 2);

    expect(ingredient).toEqual({ quantity: '200', unit: 'g', name: 'farine' });
    expect(scaledIngredient).toEqual({
      quantity: '400',
      unit: 'g',
      name: 'farine',
    });
    expect(scaledIngredient).not.toBe(ingredient);
  });
});
