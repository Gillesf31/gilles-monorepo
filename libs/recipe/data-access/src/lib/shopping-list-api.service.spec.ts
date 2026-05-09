import type { ShoppingListState } from '@gilles-monorepo/recipe-model';
import {
  toShoppingListRow,
  toShoppingListState,
} from './shopping-list-api.service';
import { EMPTY_SHOPPING_LIST_STATE } from './shopping-list.service';

describe('shopping list row mapping', () => {
  it('maps a Supabase row to the application state', () => {
    expect(
      toShoppingListState({
        id: 'default',
        selected_recipe_ids: ['recipe-1'],
        multipliers_by_recipe_id: { 'recipe-1': 2 },
        checked_item_ids: ['spaghetti::g'],
        custom_items: [
          {
            id: 'custom-0',
            quantity: '2',
            unit: 'kg',
            name: 'farine',
            recipeTitles: ['Ajout manuel'],
          },
        ],
      }),
    ).toEqual({
      selectedRecipeIds: ['recipe-1'],
      multipliersByRecipeId: { 'recipe-1': 2 },
      checkedItemIds: ['spaghetti::g'],
      customItems: [
        {
          id: 'custom-0',
          quantity: '2',
          unit: 'kg',
          name: 'farine',
          recipeTitles: ['Ajout manuel'],
        },
      ],
    });
  });

  it('maps a missing Supabase row to the empty state', () => {
    expect(toShoppingListState(null)).toEqual(EMPTY_SHOPPING_LIST_STATE);
  });

  it('maps the application state to the shared Supabase row', () => {
    const state: ShoppingListState = {
      selectedRecipeIds: ['recipe-1'],
      multipliersByRecipeId: { 'recipe-1': 2 },
      checkedItemIds: ['spaghetti::g'],
      customItems: [
        {
          id: 'custom-0',
          quantity: '2',
          unit: 'kg',
          name: 'farine',
          recipeTitles: ['Ajout manuel'],
        },
      ],
    };

    expect(toShoppingListRow(state)).toMatchObject({
      id: 'default',
      selected_recipe_ids: ['recipe-1'],
      multipliers_by_recipe_id: { 'recipe-1': 2 },
      checked_item_ids: ['spaghetti::g'],
      custom_items: [
        {
          id: 'custom-0',
          quantity: '2',
          unit: 'kg',
          name: 'farine',
          recipeTitles: ['Ajout manuel'],
        },
      ],
    });
    expect(toShoppingListRow(state).updated_at).toEqual(expect.any(String));
  });
});
