import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RecipeService } from '@gilles-monorepo/recipe-data-access';
import { Recipe } from '@gilles-monorepo/recipe-model';
import {
  ConfirmModalComponent,
  LoaderComponent,
} from '@gilles-monorepo/recipe-ui';
import { map, startWith, switchMap } from 'rxjs';

interface RecipeState {
  isLoading: boolean;
  recipe: Recipe | undefined;
}

@Component({
  selector: 'gilles-monorepo-recipe-detail',
  imports: [RouterLink, ConfirmModalComponent, LoaderComponent],
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

  protected readonly showDeleteModal = signal(false);

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
}
