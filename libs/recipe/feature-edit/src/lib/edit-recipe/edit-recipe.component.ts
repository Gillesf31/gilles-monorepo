import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NewRecipe, RecipeService } from '@gilles-monorepo/recipe-data-access';
import { map, switchMap } from 'rxjs';

@Component({
  selector: 'gilles-monorepo-edit-recipe',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './edit-recipe.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditRecipeComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly recipeService = inject(RecipeService);

  readonly id = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? '')), { initialValue: '' });

  private readonly recipe = toSignal(
    this.route.paramMap.pipe(
      switchMap(params => this.recipeService.getRecipe(params.get('id') ?? '')),
    ),
  );

  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    ingredients: new FormArray([this.createIngredient()], { validators: (fa) => (fa as FormArray<FormControl<string>>).controls.some(c => c.value.trim()) ? null : { required: true } }),
    instructions: new FormArray([this.createInstruction()]),
  });

  private readonly _ = effect(() => {
    const recipe = this.recipe();
    if (!recipe) return;
    this.form.controls.title.setValue(recipe.title);
    this.form.setControl('ingredients', new FormArray(recipe.ingredients.map(v => this.createIngredient(v)), { validators: (fa) => (fa as FormArray<FormControl<string>>).controls.some(c => c.value.trim()) ? null : { required: true } }));
    this.form.setControl('instructions', new FormArray(recipe.instructions.map(v => this.createInstruction(v))));
  });

  protected get ingredients(): FormArray<FormControl<string>> {
    return this.form.controls.ingredients;
  }

  protected get instructions(): FormArray<FormControl<string>> {
    return this.form.controls.instructions;
  }

  private createIngredient(value = ''): FormControl<string> {
    return new FormControl(value, { nonNullable: true, validators: [Validators.required] });
  }

  private createInstruction(value = ''): FormControl<string> {
    return new FormControl(value, { nonNullable: true });
  }

  protected addIngredient(): void {
    this.ingredients.push(this.createIngredient());
  }

  protected removeIngredient(index: number): void {
    if (this.ingredients.length > 1) {
      this.ingredients.removeAt(index);
    }
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
      ingredients: value.ingredients.filter(Boolean),
      instructions: value.instructions.filter(Boolean),
    };

    this.recipeService.updateRecipe(this.id(), recipe).subscribe(() => {
      this.router.navigate(['/recipe', this.id()]);
    });
  }
}
