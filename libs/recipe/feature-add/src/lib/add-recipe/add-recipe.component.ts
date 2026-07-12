import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NewRecipe, RecipeService } from '@gilles-monorepo/recipe-data-access';
import { type RecipeIngredient } from '@gilles-monorepo/recipe-model';
import { IngredientEditorComponent } from '@gilles-monorepo/recipe-ingredient-ui';
import { BtnComponent } from '@gilles-monorepo/recipe-ui';

function hasIngredientName(
  control: AbstractControl<RecipeIngredient[]>,
): { required: true } | null {
  return control.value.some((ingredient) => ingredient.name.trim())
    ? null
    : { required: true };
}

@Component({
  selector: 'gilles-monorepo-add-recipe',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    BtnComponent,
    IngredientEditorComponent,
  ],
  templateUrl: './add-recipe.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddRecipeComponent {
  private readonly recipeService = inject(RecipeService);
  private readonly router = inject(Router);

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

  get ingredients(): FormControl<RecipeIngredient[]> {
    return this.form.controls.ingredients;
  }

  get instructions(): FormArray<FormControl<string>> {
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

  private createInstruction(): FormControl<string> {
    return new FormControl('', { nonNullable: true });
  }

  addInstruction(): void {
    this.instructions.push(this.createInstruction());
  }

  removeInstruction(index: number): void {
    if (this.instructions.length > 1) {
      this.instructions.removeAt(index);
    }
  }

  submit(): void {
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

    this.recipeService.addRecipe(recipe).subscribe(() => {
      this.router.navigate(['/']);
    });
  }
}
