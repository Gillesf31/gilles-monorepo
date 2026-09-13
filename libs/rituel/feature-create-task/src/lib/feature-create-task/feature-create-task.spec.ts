import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RoutineRepository } from '@gilles-monorepo/rituel-data-access';
import {
  CreateRoutineInput,
  Routine,
  routineFrequencies,
} from '@gilles-monorepo/rituel-model';
import { CreateRoutineComponent } from './feature-create-task';

describe('CreateRoutineComponent', () => {
  const today = getCurrentLocalDate();
  let component: CreateRoutineComponent;
  let fixture: ComponentFixture<CreateRoutineComponent>;
  let repository: TestRoutineFacade;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    repository = new TestRoutineFacade();
    await repository.list();

    await TestBed.configureTestingModule({
      imports: [CreateRoutineComponent],
      providers: [
        provideRouter([]),
        { provide: RoutineRepository, useValue: repository },
      ],
    }).compileComponents();

    navigateByUrl = vi
      .spyOn(TestBed.inject(Router), 'navigateByUrl')
      .mockResolvedValue(true);
    fixture = TestBed.createComponent(CreateRoutineComponent);
    component = fixture.componentInstance;
  });

  it('defaults the first due date to local today', () => {
    expect(component.form.controls.firstDueDate.value).toBe(today);
  });

  it('defaults the native minute-precision time picker to 08:00', () => {
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector(
      '#routine-notification-time',
    ) as HTMLInputElement;
    expect(input.type).toBe('time');
    expect(input.step).toBe('60');
    expect(input.value).toBe('08:00');
  });

  it.each(['', '24:00', '12:60', '8:30', '08:30:15'])(
    'rejects the invalid notification time "%s"',
    async (notificationTime) => {
      component.form.patchValue({
        name: 'Water the plants',
        frequency: routineFrequencies.weekly,
        notificationTime,
      });
      await component.submit();
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain(
        'Choisissez une heure de rappel valide.',
      );
      expect(await repository.list()).toHaveLength(0);
      expect(navigateByUrl).not.toHaveBeenCalled();
    },
  );

  it('should make today the earliest selectable first due date when creating a routine', () => {
    fixture.detectChanges();

    const firstDueDateInput = fixture.nativeElement.querySelector(
      '#routine-first-due-date',
    ) as HTMLInputElement;

    expect(firstDueDateInput.min).toBe(today);
  });

  it('offers every three weeks as a frequency', () => {
    fixture.detectChanges();

    const frequencyOptions = Array.from(
      fixture.nativeElement.querySelectorAll('#routine-frequency option'),
    ) as HTMLOptionElement[];

    expect(frequencyOptions).toContainEqual(
      expect.objectContaining({
        value: routineFrequencies.everyThreeWeeks,
        textContent: 'Toutes les 3 semaines',
      }),
    );
  });

  it('shows validation errors and does not save an incomplete routine', async () => {
    await component.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Donnez un nom à cette routine',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'Choisissez la fréquence de répétition de cette routine',
    );
    expect(await repository.list()).toHaveLength(0);
  });

  it('trims and saves a valid routine before returning to the dashboard', async () => {
    fixture.detectChanges();
    component.form.setValue({
      name: '  Water the plants  ',
      note: '  Use the rain barrel.  ',
      firstDueDate: '2026-07-20',
      notificationTime: '08:00',
      frequency: routineFrequencies.everyThreeWeeks,
    });

    const timeInput = fixture.nativeElement.querySelector(
      '#routine-notification-time',
    ) as HTMLInputElement;
    timeInput.value = '19:15';
    timeInput.dispatchEvent(new Event('input'));

    await component.submit();

    expect((await repository.list()).at(-1)).toEqual({
      id: 'routine-new',
      name: 'Water the plants',
      note: 'Use the rain barrel.',
      firstDueDate: '2026-07-20',
      nextDueDate: '2026-07-20',
      notificationTime: '19:15',
      frequency: routineFrequencies.everyThreeWeeks,
    });
    expect(navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('shows the server error when saving fails', async () => {
    vi.spyOn(repository, 'create').mockRejectedValue(
      new Error('Your session is no longer valid'),
    );
    component.form.setValue({
      name: 'Clean the dryer',
      note: '',
      firstDueDate: '2026-07-20',
      notificationTime: '08:00',
      frequency: routineFrequencies.monthly,
    });

    await component.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Impossible d’enregistrer cette routine : Your session is no longer valid',
    );
  });
});

class TestRoutineFacade {
  private routines: Routine[] = [];

  async list(): Promise<readonly Routine[]> {
    return this.routines;
  }

  async get(id: string): Promise<Routine | undefined> {
    return this.routines.find((routine) => routine.id === id);
  }

  async create(
    input: Omit<CreateRoutineInput, 'nextDueDate'>,
  ): Promise<Routine> {
    const routine = {
      id: 'routine-new',
      ...input,
      nextDueDate: input.firstDueDate,
    };
    this.routines.push(routine);
    return routine;
  }
}

function getCurrentLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
