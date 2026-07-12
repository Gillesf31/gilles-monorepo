import { TestBed } from '@angular/core/testing';
import { IngredientListComponent } from './ingredient-list.component';

describe(IngredientListComponent.name, () => {
  it('renders formatted ingredients', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [IngredientListComponent],
    }).createComponent(IngredientListComponent);

    fixture.componentRef.setInput('ingredients', [
      { quantity: '200', unit: 'g', name: 'farine' },
      { quantity: '', unit: '', name: 'sel' },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('200 g farine');
    expect(fixture.nativeElement.textContent).toContain('sel');
  });
});
