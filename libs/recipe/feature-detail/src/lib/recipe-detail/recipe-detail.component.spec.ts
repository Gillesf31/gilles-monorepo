import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { of } from 'rxjs';
import { RecipeService } from '@gilles-monorepo/recipe-data-access';
import {
  normalizeRecipeIngredients,
  Recipe,
} from '@gilles-monorepo/recipe-model';
import { RecipeDetailComponent } from './recipe-detail.component';

const recipe = new Recipe(
  'recipe-1',
  'Ratatouille',
  normalizeRecipeIngredients([
    { name: 'Courgette', quantity: '2', unit: 'pièce' },
  ]),
  ['Couper les légumes.', 'Laisser mijoter.'],
);

describe(RecipeDetailComponent.name, () => {
  let wakeLockDescriptor: PropertyDescriptor | undefined;
  let visibilityStateDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    wakeLockDescriptor = Object.getOwnPropertyDescriptor(navigator, 'wakeLock');
    visibilityStateDescriptor = Object.getOwnPropertyDescriptor(
      document,
      'visibilityState',
    );
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
  });

  afterEach(() => {
    restoreProperty(navigator, 'wakeLock', wakeLockDescriptor);
    restoreProperty(document, 'visibilityState', visibilityStateDescriptor);
  });

  it('renders the selected recipe details', async () => {
    const fixture = createComponent();

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ratatouille');
    expect(fixture.nativeElement.textContent).toContain('Couper les légumes.');
  });

  it('keeps the screen awake while displaying a recipe', async () => {
    const wakeLock = createWakeLockSentinel();
    const request = vi.fn().mockResolvedValue(wakeLock);
    setWakeLock(request);

    const fixture = createComponent();

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(request).toHaveBeenCalledWith('screen');
    expect(fixture.nativeElement.textContent).toContain('Écran maintenu allumé');
  });

  it('releases the wake lock when leaving the recipe', async () => {
    const wakeLock = createWakeLockSentinel();
    setWakeLock(vi.fn().mockResolvedValue(wakeLock));

    const fixture = createComponent();

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.destroy();

    expect(wakeLock.release).toHaveBeenCalledOnce();
  });

  it('reacquires the wake lock when the recipe becomes visible again', async () => {
    const firstWakeLock = createWakeLockSentinel();
    const secondWakeLock = createWakeLockSentinel();
    const request = vi
      .fn()
      .mockResolvedValueOnce(firstWakeLock)
      .mockResolvedValueOnce(secondWakeLock);
    setWakeLock(request);

    const fixture = createComponent();

    fixture.detectChanges();
    await fixture.whenStable();

    setVisibilityState('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();

    setVisibilityState('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await fixture.whenStable();

    expect(firstWakeLock.release).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('falls back quietly when wake lock is unavailable', async () => {
    const fixture = createComponent();

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain(
      'Écran maintenu allumé',
    );
  });

  it('falls back quietly when wake lock is rejected', async () => {
    const request = vi.fn().mockRejectedValue(new Error('Wake lock refused'));
    setWakeLock(request);
    const fixture = createComponent();

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(request).toHaveBeenCalledWith('screen');
    expect(fixture.nativeElement.textContent).not.toContain(
      'Écran maintenu allumé',
    );
  });
});

function createComponent() {
  return TestBed.configureTestingModule({
    imports: [RecipeDetailComponent],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { paramMap: of(convertToParamMap({ id: recipe.id })) },
      },
      {
        provide: RecipeService,
        useValue: {
          getRecipe: () => of(recipe),
          deleteRecipe: vi.fn(),
        },
      },
    ],
  }).createComponent(RecipeDetailComponent);
}

function createWakeLockSentinel(): WakeLockSentinel {
  return {
    released: false,
    type: 'screen',
    release: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as WakeLockSentinel;
}

function setWakeLock(request: WakeLock['request']): void {
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: { request },
  });
}

function setVisibilityState(visibilityState: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: visibilityState,
  });
}

function restoreProperty(
  target: object,
  property: string,
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) {
    Object.defineProperty(target, property, descriptor);
    return;
  }

  Reflect.deleteProperty(target, property);
}
