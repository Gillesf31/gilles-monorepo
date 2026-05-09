import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe(App.name, () => {
  it('renders the router outlet shell', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).createComponent(App);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  });
});
