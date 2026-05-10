import { inject } from '@angular/core';
import type {
  ShoppingListItem,
  ShoppingListState,
} from '@gilles-monorepo/recipe-model';
import { SUPABASE_CLIENT } from '@gilles-monorepo/util-supabase';
import { from, map, Observable } from 'rxjs';
import {
  EMPTY_SHOPPING_LIST_STATE,
  ShoppingListService,
} from './shopping-list.service';

const SHARED_SHOPPING_LIST_ID = 'default';

interface ShoppingListRow {
  id: string;
  selected_recipe_ids: string[];
  multipliers_by_recipe_id: Record<string, number>;
  checked_item_ids: string[];
  custom_items: ShoppingListItem[];
  updated_at?: string;
}

export function toShoppingListState(
  row: ShoppingListRow | null,
): ShoppingListState {
  if (!row) {
    return EMPTY_SHOPPING_LIST_STATE;
  }

  return {
    selectedRecipeIds: row.selected_recipe_ids ?? [],
    multipliersByRecipeId: row.multipliers_by_recipe_id ?? {},
    checkedItemIds: row.checked_item_ids ?? [],
    customItems: row.custom_items ?? [],
  };
}

export function toShoppingListRow(state: ShoppingListState): ShoppingListRow {
  return {
    id: SHARED_SHOPPING_LIST_ID,
    selected_recipe_ids: [...state.selectedRecipeIds],
    multipliers_by_recipe_id: { ...state.multipliersByRecipeId },
    checked_item_ids: [...state.checkedItemIds],
    custom_items: state.customItems.map((item) => ({
      ...item,
      recipeTitles: [...item.recipeTitles],
    })),
    updated_at: new Date().toISOString(),
  };
}

export class ShoppingListApiService extends ShoppingListService {
  private readonly supabase = inject(SUPABASE_CLIENT);

  getShoppingListState(): Observable<ShoppingListState> {
    return from(
      this.supabase
        .from('shopping_lists')
        .select(
          'id, selected_recipe_ids, multipliers_by_recipe_id, checked_item_ids, custom_items',
        )
        .eq('id', SHARED_SHOPPING_LIST_ID)
        .maybeSingle()
        .throwOnError(),
    ).pipe(
      map(({ data }) => toShoppingListState(data as ShoppingListRow | null)),
    );
  }

  saveShoppingListState(state: ShoppingListState): Observable<void> {
    return from(
      this.supabase
        .from('shopping_lists')
        .upsert(toShoppingListRow(state), { onConflict: 'id' })
        .throwOnError(),
    ).pipe(map(() => undefined));
  }

  clearShoppingListState(): Observable<void> {
    return this.saveShoppingListState(EMPTY_SHOPPING_LIST_STATE);
  }
}
