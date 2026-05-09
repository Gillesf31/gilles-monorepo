import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BtnComponent } from './btn.component';

@Component({
  imports: [BtnComponent],
  template: `
    <button gillesMonorepoBtn variant="danger-filled" size="lg">
      Supprimer
    </button>
  `,
})
class BtnHostComponent {}

describe(BtnComponent.name, () => {
  it('applies variant and size classes to the host button', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [BtnHostComponent],
    }).createComponent(BtnHostComponent);

    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    expect(button.className).toContain('bg-rose-600');
    expect(button.className).toContain('px-5');
    expect(button.textContent).toContain('Supprimer');
  });
});
