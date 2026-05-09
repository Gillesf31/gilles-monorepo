import type { ShoppingListState } from '@gilles-monorepo/recipe-model';
import type { Observable } from 'rxjs';

export const EMPTY_SHOPPING_LIST_STATE: ShoppingListState = {
  selectedRecipeIds: [],
  multipliersByRecipeId: {},
  checkedItemIds: [],
  customItems: [],
};

export abstract class ShoppingListService {
  abstract getShoppingListState(): Observable<ShoppingListState>;
  abstract saveShoppingListState(state: ShoppingListState): Observable<void>;
  abstract clearShoppingListState(): Observable<void>;
}
