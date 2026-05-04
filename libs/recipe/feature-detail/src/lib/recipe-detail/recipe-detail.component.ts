import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RecipeService } from '@gilles-monorepo/recipe-data-access';
import { Recipe } from '@gilles-monorepo/recipe-model';
import {
  BtnComponent,
  ConfirmModalComponent,
  IngredientListComponent,
  LoaderComponent,
} from '@gilles-monorepo/recipe-ui';
import { map, startWith, switchMap } from 'rxjs';

interface RecipeState {
  isLoading: boolean;
  recipe: Recipe | undefined;
}

@Component({
  selector: 'gilles-monorepo-recipe-detail',
  imports: [RouterLink, BtnComponent, ConfirmModalComponent, IngredientListComponent, LoaderComponent],
  templateUrl: './recipe-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly recipeService = inject(RecipeService);

  private readonly recipeState = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) =>
        this.recipeService.getRecipe(params.get('id') ?? '').pipe(
          map((recipe) => ({ isLoading: false, recipe }) satisfies RecipeState),
          startWith({
            isLoading: true,
            recipe: undefined,
          } satisfies RecipeState),
        ),
      ),
    ),
    {
      initialValue: {
        isLoading: true,
        recipe: undefined,
      } satisfies RecipeState,
    },
  );

  protected readonly isLoading = computed(() => this.recipeState().isLoading);
  protected readonly recipe = computed(() => this.recipeState().recipe);
  protected readonly sessionIngredients = signal<string[]>([]);
  protected readonly hasCustomIngredientOrder = computed(() => {
    const recipe = this.recipe();
    const ingredients = this.sessionIngredients();

    return !!recipe && ingredients.some((ingredient, index) => ingredient !== recipe.ingredients[index]);
  });

  protected readonly showDeleteModal = signal(false);

  private readonly syncIngredients = effect(() => {
    const recipe = this.recipe();
    this.sessionIngredients.set(recipe ? [...recipe.ingredients] : []);
  });

  protected openDeleteModal(): void {
    this.showDeleteModal.set(true);
  }

  protected confirmDelete(): void {
    const id = this.recipe()?.id;
    if (!id) return;
    this.recipeService
      .deleteRecipe(id)
      .subscribe(() => this.router.navigate(['/']));
  }

  protected cancelDelete(): void {
    this.showDeleteModal.set(false);
  }

  protected moveIngredient(event: { previousIndex: number; currentIndex: number }): void {
    this.sessionIngredients.update((ingredients) => {
      const next = [...ingredients];
      moveItemInArray(next, event.previousIndex, event.currentIndex);
      return next;
    });
  }

  protected resetIngredientOrder(): void {
    const recipe = this.recipe();
    this.sessionIngredients.set(recipe ? [...recipe.ingredients] : []);
  }
}
