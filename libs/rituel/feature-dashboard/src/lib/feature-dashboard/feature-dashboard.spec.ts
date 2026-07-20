import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  Routine,
  RoutineDate,
  addDaysToRoutineDate,
  calculateNextDueDate,
  routineFrequencies,
} from '@gilles-monorepo/rituel-model';
import {
  PushNotificationService,
  PushNotificationState,
  RoutineRepository,
} from '@gilles-monorepo/rituel-data-access';
import { RituelDashboardComponent } from './feature-dashboard';

class TestRoutineRepository extends RoutineRepository {
  private readonly routineState = signal<readonly Routine[]>([]);
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

  async update(): Promise<Routine> {
    throw new Error('Not needed by this test');
  }

  async delete(): Promise<void> {
    throw new Error('Not needed by this test');
  }

  async complete(
    id: string,
    completionDate: RoutineDate,
  ): Promise<Routine> {
    const routine = this.findById(id);
    const completed = {
      ...routine,
      nextDueDate: calculateNextDueDate(completionDate, routine.frequency),
    };

    this.replace(completed);
    return completed;
  }

  async deferUntilTomorrow(
    id: string,
    referenceDate: RoutineDate,
  ): Promise<Routine> {
    const deferred = {
      ...this.findById(id),
      nextDueDate: addDaysToRoutineDate(referenceDate, 1),
    };

    this.replace(deferred);
    return deferred;
  }

  setRoutines(routines: readonly Routine[]): void {
    this.routineState.set(routines);
  }

  private findById(id: string): Routine {
    const routine = this.routineState().find((item) => item.id === id);

    if (!routine) {
      throw new Error(`Routine not found: ${id}`);
    }

    return routine;
  }

  private replace(updatedRoutine: Routine): void {
    this.routineState.update((routines) =>
      routines.map((routine) =>
        routine.id === updatedRoutine.id ? updatedRoutine : routine,
      ),
    );
  }
}

describe('RituelDashboardComponent', () => {
  let fixture: ComponentFixture<RituelDashboardComponent>;
  let repository: TestRoutineRepository;
  let notifications: TestPushNotificationService;

  beforeEach(async () => {
    repository = new TestRoutineRepository();
    notifications = new TestPushNotificationService();

    await TestBed.configureTestingModule({
      imports: [RituelDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: RoutineRepository, useValue: repository },
        { provide: PushNotificationService, useValue: notifications },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RituelDashboardComponent);
  });

  it('shows overdue, due-today, and upcoming routines from the repository', () => {
    const today = getCurrentLocalDate();
    repository.setRoutines([
      routine('overdue', addDaysToRoutineDate(today, -1)),
      routine('today', today),
      routine('upcoming', addDaysToRoutineDate(today, 1)),
    ]);

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('overdue');
    expect(fixture.nativeElement.textContent).toContain('today');
    expect(fixture.nativeElement.textContent).toContain('upcoming');
  });

  it('shows empty states when the repository has no routines', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nothing is overdue');
    expect(fixture.nativeElement.textContent).toContain(
      'Nothing needs attention today',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'No routines are coming up yet',
    );
  });

  it('completes a due routine from the dashboard', async () => {
    const today = getCurrentLocalDate();
    repository.setRoutines([routine('today', today)]);

    fixture.detectChanges();
    clickButton(fixture, 'Complete');
    await fixture.whenStable();
    fixture.detectChanges();

    expect((await repository.list())[0].nextDueDate).toBe(
      calculateNextDueDate(today, routineFrequencies.weekly),
    );
    expect(fixture.nativeElement.textContent).toContain(
      'Nothing needs attention today',
    );
  });

  it('defers an overdue routine until tomorrow from the dashboard', async () => {
    const today = getCurrentLocalDate();
    repository.setRoutines([
      routine('overdue', addDaysToRoutineDate(today, -1)),
    ]);

    fixture.detectChanges();
    clickButton(fixture, 'Tomorrow');
    await fixture.whenStable();
    fixture.detectChanges();

    expect((await repository.list())[0].nextDueDate).toBe(
      addDaysToRoutineDate(today, 1),
    );
    expect(fixture.nativeElement.textContent).toContain('Nothing is overdue');
  });

  it('asks for notification permission only after a routine exists and the user opts in', async () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Enable reminders');

    repository.setRoutines([routine('today', getCurrentLocalDate())]);
    fixture.detectChanges();
    clickButton(fixture, 'Enable reminders');
    await fixture.whenStable();

    expect(notifications.enableCalls).toBe(1);
  });

  it('offers another attempt after notification setup fails', async () => {
    repository.setRoutines([routine('today', getCurrentLocalDate())]);
    notifications.fail();
    fixture.detectChanges();

    clickButton(fixture, 'Try again');
    await fixture.whenStable();

    expect(notifications.enableCalls).toBe(1);
  });
});

class TestPushNotificationService extends PushNotificationService {
  private readonly stateValue = signal<PushNotificationState>('ready');
  private readonly messageValue = signal('');

  readonly state = this.stateValue.asReadonly();
  readonly message = this.messageValue.asReadonly();
  enableCalls = 0;

  async enableAndSendTest(): Promise<void> {
    this.enableCalls += 1;
    this.stateValue.set('enabled');
    this.messageValue.set('Test notification sent.');
  }

  async sendTest(): Promise<void> {
    this.messageValue.set('Test notification sent.');
  }

  fail(): void {
    this.stateValue.set('error');
  }
}

function clickButton(
  fixture: ComponentFixture<RituelDashboardComponent>,
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

function routine(id: string, nextDueDate: RoutineDate): Routine {
  return {
    id,
    name: id,
    firstDueDate: nextDueDate,
    nextDueDate,
    frequency: routineFrequencies.weekly,
  };
}

function getCurrentLocalDate(): RoutineDate {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
