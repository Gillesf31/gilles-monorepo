import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import {
  Routine,
  UpdateRoutineInput,
  routineFrequencies,
} from '@gilles-monorepo/rituel-model';
import { RoutineRepository } from '@gilles-monorepo/rituel-data-access';
import { vi } from 'vitest';
import { EditRoutineComponent } from './feature-edit-task';

class TestRoutineRepository extends RoutineRepository {
  private readonly routineState = signal<readonly Routine[]>([
    {
      id: 'routine-1',
      name: 'Clean the washing machine',
      note: 'Run the drum-clean cycle.',
      firstDueDate: '2026-07-01',
      nextDueDate: '2026-07-18',
      frequency: routineFrequencies.monthly,
    },
  ]);
  readonly routines = this.routineState.asReadonly();

  async list(): Promise<readonly Routine[]> {
    return this.routineState();
  }

  async get(id: string): Promise<Routine | undefined> {
    return this.routineState().find((routine) => routine.id === id);
  }

  async create(): Promise<Routine> {
    throw new Error('Not needed by this test');
  }

  async update(id: string, input: UpdateRoutineInput): Promise<Routine> {
    const routine: Routine = { id, ...input };
    this.routineState.update((routines) =>
      routines.map((item) => (item.id === id ? routine : item)),
    );
    return routine;
  }

  async delete(id: string): Promise<void> {
    this.routineState.update((routines) =>
      routines.filter((routine) => routine.id !== id),
    );
  }

  async complete(): Promise<Routine> {
    throw new Error('Not needed by this test');
  }

  async deferUntilTomorrow(): Promise<Routine> {
    throw new Error('Not needed by this test');
  }
}

describe('EditRoutineComponent', () => {
  let component: EditRoutineComponent;
  let fixture: ComponentFixture<EditRoutineComponent>;
  let repository: TestRoutineRepository;
  let router: Router;

  beforeEach(async () => {
    repository = new TestRoutineRepository();

    await TestBed.configureTestingModule({
      imports: [EditRoutineComponent],
      providers: [
        provideRouter([]),
        { provide: RoutineRepository, useValue: repository },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: 'routine-1' }) },
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(EditRoutineComponent);
    component = fixture.componentInstance;
  });

  it('loads the routine into the edit form', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.form.getRawValue()).toEqual({
      name: 'Clean the washing machine',
      note: 'Run the drum-clean cycle.',
      nextDueDate: '2026-07-18',
      frequency: routineFrequencies.monthly,
    });
  });

  it('saves edited routine details and returns to the dashboard', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.form.setValue({
      name: 'Clean the dryer',
      note: 'Empty the lint trap first.',
      nextDueDate: '2026-07-22',
      frequency: routineFrequencies.everyTwoWeeks,
    });

    await component.submit();

    expect(await repository.get('routine-1')).toEqual({
      id: 'routine-1',
      name: 'Clean the dryer',
      note: 'Empty the lint trap first.',
      firstDueDate: '2026-07-01',
      nextDueDate: '2026-07-22',
      frequency: routineFrequencies.everyTwoWeeks,
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('requires confirmation before deleting the routine', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    clickButton(fixture, 'Delete routine');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Delete this routine permanently?',
    );

    await component.deleteRoutine();

    expect(await repository.get('routine-1')).toBeUndefined();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });
});

function clickButton(
  fixture: ComponentFixture<EditRoutineComponent>,
  label: string,
): void {
  const button = Array.from(
    fixture.nativeElement.querySelectorAll('button'),
  ).find((element: HTMLButtonElement) => element.textContent?.trim() === label);

  if (!button) {
    throw new Error(`Expected a ${label} button`);
  }

  button.click();
}
