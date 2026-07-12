import { TestBed } from '@angular/core/testing';
import { IngredientEditorComponent } from './ingredient-editor.component';

describe(IngredientEditorComponent.name, () => {
  it('emits a new ingredient when the add button is used', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [IngredientEditorComponent],
    }).createComponent(IngredientEditorComponent);
    const emitted: unknown[] = [];

    fixture.componentInstance.ingredientsChange.subscribe((ingredients) =>
      emitted.push(ingredients),
    );
    fixture.detectChanges();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLButtonElement>(
        'button[type="button"]',
      ),
    );
    const addButton = buttons.find((button) =>
      button.textContent?.includes('Ajouter un ingrédient'),
    );

    expect(addButton).toBeTruthy();
    addButton?.click();

    expect(emitted).toEqual([
      [
        { name: '', quantity: '', unit: '' },
        { name: '', quantity: '', unit: '' },
      ],
    ]);
  });
});
