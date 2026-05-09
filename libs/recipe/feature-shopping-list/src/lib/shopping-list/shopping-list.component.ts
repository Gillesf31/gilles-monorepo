import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { take } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  RecipeService,
  ShoppingListService,
} from '@gilles-monorepo/recipe-data-access';
import {
  createShoppingListItems,
  Recipe,
  type ShoppingListItem,
  type ShoppingListState,
} from '@gilles-monorepo/recipe-model';
import { BtnComponent, LoaderComponent } from '@gilles-monorepo/recipe-ui';

@Component({
  selector: 'gilles-monorepo-shopping-list',
  imports: [BtnComponent, LoaderComponent, RouterLink],
  templateUrl: './shopping-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShoppingListComponent implements OnInit {
  protected readonly multiplierStep = 0.25;

  private readonly recipeService = inject(RecipeService);
  private readonly shoppingListService = inject(ShoppingListService);
  private readonly destroyRef = inject(DestroyRef);
  private nextCustomItemId = 0;

  protected readonly recipes = toSignal(this.recipeService.getRecipes());
  protected readonly isPersistedStateLoading = signal(true);
  protected readonly isLoading = computed(
    () => this.recipes() === undefined || this.isPersistedStateLoading(),
  );
  protected readonly selectedRecipeIds = signal<ReadonlySet<string>>(new Set());
  protected readonly multipliersByRecipeId = signal<Record<string, number>>({});
  protected readonly checkedItemIds = signal<ReadonlySet<string>>(new Set());
  protected readonly customItems = signal<readonly ShoppingListItem[]>([]);

  protected readonly selectedRecipes = computed(() => {
    const selectedIds = this.selectedRecipeIds();
    return (this.recipes() ?? []).filter((recipe) =>
      selectedIds.has(recipe.id),
    );
  });

  protected readonly shoppingListItems = computed(() =>
    createShoppingListItems(
      this.selectedRecipes().map((recipe) => ({
        recipe,
        multiplier: this.multiplierFor(recipe),
      })),
    ),
  );

  protected readonly allShoppingListItems = computed(() => [
    ...this.shoppingListItems(),
    ...this.customItems(),
  ]);

  protected readonly selectedCountLabel = computed(() => {
    const count = this.selectedRecipes().length;
    if (count === 0) return 'Aucune recette sélectionnée';
    if (count === 1) return 'Une recette sélectionnée';
    return `${count} recettes sélectionnées`;
  });

  protected readonly checkedCount = computed(() => this.checkedItemIds().size);

  ngOnInit(): void {
    this.shoppingListService
      .getShoppingListState()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        this.restoreShoppingListState(state);
        this.isPersistedStateLoading.set(false);
      });
  }

  protected selectAllRecipes(): void {
    const recipeIds = (this.recipes() ?? []).map((recipe) => recipe.id);
    this.selectedRecipeIds.set(new Set(recipeIds));
    this.persistShoppingListState();
  }

  protected clearSelectedRecipes(): void {
    this.selectedRecipeIds.set(new Set());
    this.multipliersByRecipeId.set({});
    this.customItems.set([]);
    this.checkedItemIds.set(new Set());
    this.shoppingListService.clearShoppingListState().subscribe();
  }

  protected toggleRecipe(recipe: Recipe, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedRecipeIds.update((selectedIds) => {
      const next = new Set(selectedIds);
      if (checked) {
        next.add(recipe.id);
      } else {
        next.delete(recipe.id);
      }
      return next;
    });
    this.checkedItemIds.set(new Set());
    this.persistShoppingListState();
  }

  protected updateMultiplier(recipe: Recipe, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setMultiplier(recipe, Number(input.value));
    input.value = String(this.multiplierFor(recipe));
  }

  protected decreaseMultiplier(recipe: Recipe): void {
    this.setMultiplier(
      recipe,
      this.multiplierFor(recipe) - this.multiplierStep,
    );
  }

  protected increaseMultiplier(recipe: Recipe): void {
    this.setMultiplier(
      recipe,
      this.multiplierFor(recipe) + this.multiplierStep,
    );
  }

  protected setMultiplier(recipe: Recipe, multiplier: number): void {
    const normalizedMultiplier = this.normalizeMultiplier(multiplier);
    this.multipliersByRecipeId.update((multipliers) => ({
      ...multipliers,
      [recipe.id]: normalizedMultiplier,
    }));
    this.checkedItemIds.set(new Set());
    this.persistShoppingListState();
  }

  protected multiplierFor(recipe: Recipe): number {
    return this.multipliersByRecipeId()[recipe.id] ?? 1;
  }

  protected isRecipeSelected(recipe: Recipe): boolean {
    return this.selectedRecipeIds().has(recipe.id);
  }

  protected toggleItem(item: ShoppingListItem, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.checkedItemIds.update((checkedIds) => {
      const next = new Set(checkedIds);
      if (checked) {
        next.add(item.id);
      } else {
        next.delete(item.id);
      }
      return next;
    });
    this.persistShoppingListState();
  }

  protected isItemChecked(item: ShoppingListItem): boolean {
    return this.checkedItemIds().has(item.id);
  }

  protected clearCheckedItems(): void {
    this.checkedItemIds.set(new Set());
  }

  protected addCustomItem(
    nameInput: HTMLInputElement,
    quantityInput: HTMLInputElement,
    unitInput: HTMLInputElement,
  ): void {
    const name = nameInput.value.trim();
    if (!name) {
      return;
    }

    this.customItems.update((items) => [
      ...items,
      {
        id: `custom-${this.nextCustomItemId++}`,
        name,
        quantity: quantityInput.value.trim(),
        unit: unitInput.value.trim(),
        recipeTitles: ['Ajout manuel'],
      },
    ]);

    nameInput.value = '';
    quantityInput.value = '';
    unitInput.value = '';
    this.persistShoppingListState();
  }

  protected removeCustomItem(item: ShoppingListItem): void {
    this.customItems.update((items) =>
      items.filter((customItem) => customItem.id !== item.id),
    );
    this.checkedItemIds.update((checkedIds) => {
      const next = new Set(checkedIds);
      next.delete(item.id);
      return next;
    });
    this.persistShoppingListState();
  }

  protected isCustomItem(item: ShoppingListItem): boolean {
    return item.id.startsWith('custom-');
  }

  protected formatItem(item: ShoppingListItem): string {
    return [item.quantity, item.unit, item.name].filter(Boolean).join(' ');
  }

  protected recipeSourceLabel(item: ShoppingListItem): string {
    if (item.recipeTitles.length === 1) {
      return item.recipeTitles[0];
    }
    return `${item.recipeTitles.length} recettes`;
  }

  private normalizeMultiplier(multiplier: number): number {
    if (!Number.isFinite(multiplier)) {
      return 1;
    }

    return Math.max(this.multiplierStep, multiplier);
  }

  private restoreShoppingListState(state: ShoppingListState): void {
    this.selectedRecipeIds.set(new Set(state.selectedRecipeIds));
    this.multipliersByRecipeId.set({ ...state.multipliersByRecipeId });
    this.checkedItemIds.set(new Set(state.checkedItemIds));
    this.customItems.set(
      state.customItems.map((item) => ({
        ...item,
        recipeTitles: [...item.recipeTitles],
      })),
    );
    this.nextCustomItemId = this.getNextCustomItemId(state.customItems);
  }

  private persistShoppingListState(): void {
    this.shoppingListService
      .saveShoppingListState({
        selectedRecipeIds: Array.from(this.selectedRecipeIds()),
        multipliersByRecipeId: { ...this.multipliersByRecipeId() },
        checkedItemIds: Array.from(this.checkedItemIds()),
        customItems: this.customItems().map((item) => ({
          ...item,
          recipeTitles: [...item.recipeTitles],
        })),
      })
      .subscribe();
  }

  private getNextCustomItemId(items: readonly ShoppingListItem[]): number {
    const usedIds = items
      .map((item) => Number(item.id.replace(/^custom-/, '')))
      .filter(Number.isInteger);

    return usedIds.length ? Math.max(...usedIds) + 1 : 0;
  }
}
