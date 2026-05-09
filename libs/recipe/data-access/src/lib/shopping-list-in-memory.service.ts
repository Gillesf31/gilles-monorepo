import type { ShoppingListState } from '@gilles-monorepo/recipe-model';
import { BehaviorSubject, Observable, of } from 'rxjs';
import {
  EMPTY_SHOPPING_LIST_STATE,
  ShoppingListService,
} from './shopping-list.service';

const STORAGE_KEY = 'recipe-shopping-list-state';

function cloneShoppingListState(state: ShoppingListState): ShoppingListState {
  return {
    selectedRecipeIds: [...state.selectedRecipeIds],
    multipliersByRecipeId: { ...state.multipliersByRecipeId },
    checkedItemIds: [...state.checkedItemIds],
    customItems: state.customItems.map((item) => ({
      ...item,
      recipeTitles: [...item.recipeTitles],
    })),
  };
}

function readStoredState(): ShoppingListState {
  if (typeof localStorage === 'undefined') {
    return EMPTY_SHOPPING_LIST_STATE;
  }

  const storedValue = localStorage.getItem(STORAGE_KEY);
  if (!storedValue) {
    return EMPTY_SHOPPING_LIST_STATE;
  }

  try {
    return cloneShoppingListState(JSON.parse(storedValue) as ShoppingListState);
  } catch {
    return EMPTY_SHOPPING_LIST_STATE;
  }
}

function writeStoredState(state: ShoppingListState): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearStoredState(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}

export class ShoppingListInMemoryService extends ShoppingListService {
  private readonly state$ = new BehaviorSubject<ShoppingListState>(
    readStoredState(),
  );

  getShoppingListState(): Observable<ShoppingListState> {
    return this.state$.asObservable();
  }

  saveShoppingListState(state: ShoppingListState): Observable<void> {
    const nextState = cloneShoppingListState(state);
    writeStoredState(nextState);
    this.state$.next(nextState);
    return of(undefined);
  }

  clearShoppingListState(): Observable<void> {
    clearStoredState();
    this.state$.next(EMPTY_SHOPPING_LIST_STATE);
    return of(undefined);
  }
}
