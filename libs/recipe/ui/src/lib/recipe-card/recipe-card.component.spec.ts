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

  it('exposes an accessible pin action and emits a toggle', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [RecipeCardComponent],
    }).createComponent(RecipeCardComponent);
    const pinToggled = vi.fn();
    fixture.componentInstance.pinToggled.subscribe(pinToggled);
    fixture.componentRef.setInput(
      'recipe',
      new Recipe('recipe-1', 'Soupe aux tomates', [], []),
    );
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const button = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Épingler la recette"]',
    );
    button?.click();

    expect(button?.getAttribute('aria-pressed')).toBe('false');
    expect(pinToggled).toHaveBeenCalledOnce();
  });

  it('renders the active state and disables the action while pinning', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [RecipeCardComponent],
    }).createComponent(RecipeCardComponent);
    fixture.componentRef.setInput(
      'recipe',
      new Recipe('recipe-1', 'Soupe aux tomates', [], [], false, true),
    );
    fixture.componentRef.setInput('pinning', true);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const button = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Désépingler la recette"]',
    );

    expect(button?.getAttribute('aria-pressed')).toBe('true');
    expect(button?.disabled).toBe(true);
    expect(button?.querySelector('svg')?.getAttribute('fill')).toBe(
      'currentColor',
    );
  });

  it('keeps recipe selection available while hiding mutation controls in readonly mode', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [RecipeCardComponent],
    }).createComponent(RecipeCardComponent);
    fixture.componentRef.setInput(
      'recipe',
      new Recipe('recipe-1', 'Soupe aux tomates', [], []),
    );
    fixture.componentRef.setInput('readonlyMode', true);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('button[aria-label="Épingler la recette"]')).toBeNull();
    expect(element.querySelector('button[aria-label="Supprimer la recette"]')).toBeNull();
    expect(element.textContent).toContain('Voir la recette');
  });
});
