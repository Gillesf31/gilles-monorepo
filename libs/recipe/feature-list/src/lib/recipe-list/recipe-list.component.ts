import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { RecipeService } from '@gilles-monorepo/recipe-data-access';
import { formatRecipeIngredient, Recipe } from '@gilles-monorepo/recipe-model';
import { RecipeCardComponent } from '@gilles-monorepo/recipe-card-ui';
import {
  BtnComponent,
  ConfirmModalComponent,
  LoaderComponent,
} from '@gilles-monorepo/recipe-ui';

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

  protected readonly recipes = toSignal(this.recipeService.getRecipes());
  protected readonly isLoading = computed(() => this.recipes() === undefined);
  protected readonly searchQuery = signal('');
  protected readonly recipeToDelete = signal<Recipe | null>(null);

  protected readonly filteredRecipes = computed(() => {
    const recipes = this.recipes() ?? [];
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return recipes;
    return recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(query) ||
        r.ingredients.some((ingredient) =>
          formatRecipeIngredient(ingredient).toLowerCase().includes(query),
        ),
    );
  });

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
}
