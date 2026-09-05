import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { RecipeService } from '@gilles-monorepo/recipe-data-access';
import { formatRecipeIngredient, Recipe } from '@gilles-monorepo/recipe-model';
import {
  BtnComponent,
  ConfirmModalComponent,
  LoaderComponent,
  RecipeCardComponent,
} from '@gilles-monorepo/recipe-ui';
import { finalize } from 'rxjs';

const frenchTitleCollator = new Intl.Collator('fr', {
  sensitivity: 'base',
});

@Component({
  selector: 'gilles-monorepo-recipe-list',
  imports: [
    RecipeCardComponent,
    BtnComponent,
    ConfirmModalComponent,
    LoaderComponent,
    RouterLink,
  ],
  templateUrl: './recipe-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeListComponent {
  private readonly recipeService = inject(RecipeService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly recipes = signal<Recipe[] | undefined>(undefined);
  protected readonly loadError = signal(false);
  protected readonly isLoading = computed(
    () => this.recipes() === undefined && !this.loadError(),
  );
  protected readonly canMutate = computed(
    () => this.recipeService.readStatus().mode === 'live',
  );
  protected readonly isUsingCachedRecipes = computed(
    () => this.recipeService.readStatus().mode === 'cached',
  );
  protected readonly cachedAtLabel = computed(() =>
    formatCachedAt(this.recipeService.readStatus().cachedAt),
  );
  protected readonly searchQuery = signal('');
  protected readonly recipeToDelete = signal<Recipe | null>(null);
  protected readonly pinningRecipeIds = signal<ReadonlySet<string>>(new Set());
  protected readonly pinError = signal<string | null>(null);

  protected readonly filteredRecipes = computed(() => {
    const recipes = this.recipes() ?? [];
    const query = this.searchQuery().trim().toLowerCase();
    const filtered = query
      ? recipes.filter(
          (recipe) =>
            recipe.title.toLowerCase().includes(query) ||
            recipe.ingredients.some((ingredient) =>
              formatRecipeIngredient(ingredient)
                .toLowerCase()
                .includes(query),
            ),
        )
      : recipes;
    const pinned = filtered
      .filter((recipe) => recipe.isPinned)
      .sort((left, right) =>
        frenchTitleCollator.compare(left.title, right.title),
      );
    const unpinned = filtered.filter((recipe) => !recipe.isPinned);

    return [...pinned, ...unpinned];
  });

  constructor() {
    this.loadRecipes();
  }

  protected retryLoading(): void {
    this.loadRecipes();
  }

  private loadRecipes(): void {
    this.recipes.set(undefined);
    this.loadError.set(false);
    this.recipeService
      .getRecipes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (recipes) => this.recipes.set(recipes),
        error: () => this.loadError.set(true),
      });
  }

  protected togglePinned(recipe: Recipe): void {
    if (this.pinningRecipeIds().has(recipe.id)) return;

    this.pinError.set(null);
    this.setPinning(recipe.id, true);
    this.recipeService
      .setPinned(recipe.id, !recipe.isPinned)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.setPinning(recipe.id, false)),
      )
      .subscribe({
        next: (updatedRecipe) =>
          this.recipes.update((recipes) =>
            recipes?.map((candidate) =>
              candidate.id === updatedRecipe.id ? updatedRecipe : candidate,
            ),
          ),
        error: () =>
          this.pinError.set(
            "Impossible de modifier l’épinglage de la recette. Réessayez.",
          ),
      });
  }

  protected openDeleteModal(recipe: Recipe): void {
    this.recipeToDelete.set(recipe);
  }

  protected confirmDelete(): void {
    const id = this.recipeToDelete()?.id;
    if (!id) return;
    this.recipeService.deleteRecipe(id).subscribe();
    this.recipeToDelete.set(null);
  }

  protected cancelDelete(): void {
    this.recipeToDelete.set(null);
  }

  protected navigateToDetail(recipe: Recipe): void {
    this.router.navigate(['/recipe', recipe.id]);
  }

  private setPinning(id: string, pinning: boolean): void {
    this.pinningRecipeIds.update((ids) => {
      const updatedIds = new Set(ids);
      if (pinning) {
        updatedIds.add(id);
      } else {
        updatedIds.delete(id);
      }
      return updatedIds;
    });
  }
}

function formatCachedAt(cachedAt: string | null): string {
  if (!cachedAt) {
    return 'à une date inconnue';
  }

  return new Intl.DateTimeFormat('fr-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(cachedAt));
}
