import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NewRecipe, RecipeService } from '@gilles-monorepo/recipe-data-access';

@Component({
  selector: 'gilles-monorepo-add-recipe',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './add-recipe.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddRecipeComponent {
  private readonly recipeService = inject(RecipeService);
  private readonly router = inject(Router);

  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    ingredients: new FormArray([this.createItem()]),
    instructions: new FormArray([this.createItem()]),
  });

  get ingredients(): FormArray<FormControl<string>> {
    return this.form.controls.ingredients;
  }

  get instructions(): FormArray<FormControl<string>> {
    return this.form.controls.instructions;
  }

  private createItem(): FormControl<string> {
    return new FormControl('', { nonNullable: true, validators: [Validators.required] });
  }

  addIngredient(): void {
    this.ingredients.push(this.createItem());
  }

  removeIngredient(index: number): void {
    if (this.ingredients.length > 1) {
      this.ingredients.removeAt(index);
    }
  }

  addInstruction(): void {
    this.instructions.push(this.createItem());
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
      ingredients: value.ingredients.filter(Boolean),
      instructions: value.instructions.filter(Boolean),
    };

    this.recipeService.addRecipe(recipe).subscribe(() => {
      this.router.navigate(['/']);
    });
  }
}
