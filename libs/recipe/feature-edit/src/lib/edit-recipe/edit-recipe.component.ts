import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NewRecipe, RecipeService } from '@gilles-monorepo/recipe-data-access';
import { type RecipeIngredient } from '@gilles-monorepo/recipe-model';
import { IngredientEditorComponent } from '@gilles-monorepo/recipe-ingredient-ui';
import { BtnComponent } from '@gilles-monorepo/recipe-ui';
import { map, switchMap } from 'rxjs';

function hasIngredientName(
  control: AbstractControl<RecipeIngredient[]>,
): { required: true } | null {
  return control.value.some((ingredient) => ingredient.name.trim())
    ? null
    : { required: true };
}

@Component({
  selector: 'gilles-monorepo-edit-recipe',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    BtnComponent,
    IngredientEditorComponent,
  ],
  templateUrl: './edit-recipe.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditRecipeComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly recipeService = inject(RecipeService);

  readonly id = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('id') ?? '')),
    { initialValue: '' },
  );

  private readonly recipe = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) =>
        this.recipeService.getRecipe(params.get('id') ?? ''),
      ),
    ),
  );

  readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    ingredients: new FormControl<RecipeIngredient[]>(
      [this.createIngredient()],
      {
        nonNullable: true,
        validators: [hasIngredientName],
      },
    ),
    instructions: new FormArray([this.createInstruction()]),
    isWorkInProgress: new FormControl(false, { nonNullable: true }),
  });

  private readonly _ = effect(() => {
    const recipe = this.recipe();
    if (!recipe) return;
    this.form.controls.title.setValue(recipe.title);
    this.form.controls.isWorkInProgress.setValue(recipe.isWorkInProgress);
    this.ingredients.setValue(
      recipe.ingredients.map((ingredient) => ({ ...ingredient })),
    );
    this.form.setControl(
      'instructions',
      new FormArray(recipe.instructions.map((v) => this.createInstruction(v))),
    );
  });

  protected get ingredients(): FormControl<RecipeIngredient[]> {
    return this.form.controls.ingredients;
  }

  protected get instructions(): FormArray<FormControl<string>> {
    return this.form.controls.instructions;
  }

  protected setIngredients(ingredients: RecipeIngredient[]): void {
    this.ingredients.setValue(ingredients);
    this.ingredients.markAsDirty();
    this.ingredients.markAsTouched();
  }

  private createIngredient(): RecipeIngredient {
    return { name: '', quantity: '', unit: '' };
  }

  private createInstruction(value = ''): FormControl<string> {
    return new FormControl(value, { nonNullable: true });
  }

  protected addInstruction(): void {
    this.instructions.push(this.createInstruction());
  }

  protected removeInstruction(index: number): void {
    if (this.instructions.length > 1) {
      this.instructions.removeAt(index);
    }
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const recipe: NewRecipe = {
      title: value.title,
      ingredients: value.ingredients
        .map((ingredient) => ({
          name: ingredient.name.trim(),
          quantity: ingredient.quantity.trim(),
          unit: ingredient.unit.trim(),
        }))
        .filter((ingredient) => ingredient.name),
      instructions: value.instructions.filter(Boolean),
      isWorkInProgress: value.isWorkInProgress,
    };

    this.recipeService.updateRecipe(this.id(), recipe).subscribe(() => {
      this.router.navigate(['/recipe', this.id()]);
    });
  }
}
