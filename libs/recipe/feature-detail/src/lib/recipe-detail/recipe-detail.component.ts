import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RecipeService } from '@gilles-monorepo/recipe-data-access';
import {
  hasRecipeIngredientUnits,
  Recipe,
  scaleRecipeIngredients,
  type RecipeIngredient,
} from '@gilles-monorepo/recipe-model';
import { IngredientListComponent } from '@gilles-monorepo/recipe-ingredient-ui';
import {
  BtnComponent,
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
  imports: [
    RouterLink,
    BtnComponent,
    ConfirmModalComponent,
    IngredientListComponent,
    LoaderComponent,
  ],
  templateUrl: './recipe-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly recipeService = inject(RecipeService);
  private readonly destroyRef = inject(DestroyRef);
  private wakeLock: WakeLockSentinel | null = null;
  private wakeLockRequestInFlight = false;
  private isDestroyed = false;

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
  protected readonly isWakeLockActive = signal(false);
  protected readonly sessionIngredients = signal<RecipeIngredient[]>([]);
  protected readonly multiplier = signal(1);
  protected readonly multiplierPresets = [1, 2, 3] as const;
  protected readonly canScaleIngredients = computed(() =>
    hasRecipeIngredientUnits(this.sessionIngredients()),
  );
  protected readonly scaledIngredients = computed(() =>
    this.canScaleIngredients()
      ? scaleRecipeIngredients(this.sessionIngredients(), this.multiplier())
      : this.sessionIngredients(),
  );
  protected readonly hasCustomIngredientOrder = computed(() => {
    const recipe = this.recipe();
    const ingredients = this.sessionIngredients();

    return (
      !!recipe &&
      ingredients.some(
        (ingredient, index) => ingredient !== recipe.ingredients[index],
      )
    );
  });

  protected readonly showDeleteModal = signal(false);

  private readonly syncIngredients = effect(() => {
    const recipe = this.recipe();
    this.sessionIngredients.set(recipe ? [...recipe.ingredients] : []);
    if (!recipe || !hasRecipeIngredientUnits(recipe.ingredients)) {
      this.multiplier.set(1);
    }
  });

  ngOnInit(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.destroyRef.onDestroy(() => {
      this.isDestroyed = true;
      document.removeEventListener(
        'visibilitychange',
        this.handleVisibilityChange,
      );
      void this.releaseWakeLock();
    });

    void this.requestWakeLock();
  }

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

  protected moveIngredient(event: {
    previousIndex: number;
    currentIndex: number;
  }): void {
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

  protected setMultiplier(multiplier: number): void {
    this.multiplier.set(this.normalizeMultiplier(multiplier));
  }

  protected updateMultiplier(event: Event): void {
    const input = event.target as HTMLInputElement;
    const multiplier = this.normalizeMultiplier(Number(input.value));
    this.multiplier.set(multiplier);
    input.value = String(multiplier);
  }

  protected isMultiplierPresetActive(preset: number): boolean {
    return this.multiplier() === preset;
  }

  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      void this.requestWakeLock();
      return;
    }

    void this.releaseWakeLock();
  };

  private async requestWakeLock(): Promise<void> {
    if (
      this.isDestroyed ||
      this.wakeLock ||
      this.wakeLockRequestInFlight ||
      !this.isDocumentVisible() ||
      !this.supportsScreenWakeLock()
    ) {
      return;
    }

    this.wakeLockRequestInFlight = true;

    try {
      const wakeLock = await navigator.wakeLock.request('screen');

      if (this.isDestroyed || !this.isDocumentVisible()) {
        await wakeLock.release();
        return;
      }

      this.wakeLock = wakeLock;
      this.isWakeLockActive.set(true);
      wakeLock.addEventListener('release', this.handleWakeLockRelease, {
        once: true,
      });
    } catch {
      // The device or browser may refuse a wake lock. The recipe remains usable.
    } finally {
      this.wakeLockRequestInFlight = false;
    }
  }

  private async releaseWakeLock(): Promise<void> {
    const wakeLock = this.wakeLock;
    this.wakeLock = null;
    this.isWakeLockActive.set(false);

    if (!wakeLock) return;

    try {
      await wakeLock.release();
    } catch {
      // A released sentinel cannot be released again.
    }
  }

  private readonly handleWakeLockRelease = (): void => {
    this.wakeLock = null;
    this.isWakeLockActive.set(false);
  };

  private isDocumentVisible(): boolean {
    return typeof document !== 'undefined' && document.visibilityState === 'visible';
  }

  private supportsScreenWakeLock(): boolean {
    return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  }

  private normalizeMultiplier(multiplier: number): number {
    return Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  }
}
