import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  Routine,
  RoutineDate,
  addDaysToRoutineDate,
  routineFrequencies,
} from '@gilles-monorepo/rituel-model';
import { RoutineRepository } from '@gilles-monorepo/rituel-data-access';
import { RituelDashboardComponent } from './feature-dashboard';

class TestRoutineRepository extends RoutineRepository {
  private readonly routineState = signal<readonly Routine[]>([]);
  readonly routines = this.routineState.asReadonly();

  list(): readonly Routine[] {
    return this.routineState();
  }

  create(): Routine {
    throw new Error('Not needed by this test');
  }

  complete(): Routine {
    throw new Error('Not needed by this test');
  }

  deferUntilTomorrow(): Routine {
    throw new Error('Not needed by this test');
  }

  setRoutines(routines: readonly Routine[]): void {
    this.routineState.set(routines);
  }
}

describe('RituelDashboardComponent', () => {
  let fixture: ComponentFixture<RituelDashboardComponent>;
  let repository: TestRoutineRepository;

  beforeEach(async () => {
    repository = new TestRoutineRepository();

    await TestBed.configureTestingModule({
      imports: [RituelDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: RoutineRepository, useValue: repository },
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
});

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
