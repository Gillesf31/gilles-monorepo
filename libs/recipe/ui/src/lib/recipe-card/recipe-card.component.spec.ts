import { TestBed } from '@angular/core/testing';
import { Recipe, type RecipeIngredient } from '@gilles-monorepo/recipe-model';
import { RecipeCardComponent } from './recipe-card.component';

describe(RecipeCardComponent.name, () => {
  it('renders the recipe title and formatted ingredients', () => {
    const recipe = new Recipe(
      'recipe-1',
      'Soupe aux tomates',
      [
        { quantity: '500', unit: 'g', name: 'tomates' },
        { quantity: '', unit: '', name: 'basilic' },
      ] satisfies RecipeIngredient[],
      ['Mixer les ingredients.'],
    );

    const fixture = TestBed.configureTestingModule({
      imports: [RecipeCardComponent],
    }).createComponent(RecipeCardComponent);

    fixture.componentRef.setInput('recipe', recipe);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Soupe aux tomates');
    expect(fixture.nativeElement.textContent).toContain('500 g tomates');
    expect(fixture.nativeElement.textContent).toContain('basilic');
    expect(fixture.nativeElement.textContent).not.toContain('À tester');
  });

  it('renders a label when the recipe is still being tested', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [RecipeCardComponent],
    }).createComponent(RecipeCardComponent);

    fixture.componentRef.setInput(
      'recipe',
      new Recipe('recipe-1', 'Soupe aux tomates', [], [], true),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('À tester');
  });
});
