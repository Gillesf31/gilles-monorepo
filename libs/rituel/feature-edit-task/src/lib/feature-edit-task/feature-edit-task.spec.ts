import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { Routine, routineFrequencies } from '@gilles-monorepo/rituel-model';
import { RoutineRepository } from '@gilles-monorepo/rituel-data-access';
import { vi } from 'vitest';
import { EditRoutineComponent } from './feature-edit-task';

class TestRoutineFacade {
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

  async update(
    id: string,
    input: Pick<Routine, 'name' | 'note' | 'nextDueDate' | 'frequency'>,
  ): Promise<Routine> {
    const existing = await this.get(id);
    if (!existing) throw new Error(`Routine not found: ${id}`);
    const routine: Routine = {
      id,
      ...input,
      firstDueDate: existing.firstDueDate,
    };
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
  let repository: TestRoutineFacade;
  let router: Router;

  beforeEach(async () => {
    repository = new TestRoutineFacade();

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

  it('should make today the earliest selectable next due date when editing a routine', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const nextDueDateInput = fixture.nativeElement.querySelector(
      '#routine-next-due-date',
    ) as HTMLInputElement;

    expect(nextDueDateInput.value).toBe('2026-07-18');
    expect(nextDueDateInput.min).toBe(getCurrentLocalDate());
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
    clickButton(fixture, 'Supprimer la routine');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Supprimer définitivement cette routine ?',
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
  const rootElement = fixture.nativeElement as HTMLElement;
  const button = Array.from(
    rootElement.querySelectorAll<HTMLButtonElement>('button'),
  ).find((element) => element.textContent?.trim() === label);

  if (!button) {
    throw new Error(`Expected a ${label} button`);
  }

  button.click();
}

function getCurrentLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
