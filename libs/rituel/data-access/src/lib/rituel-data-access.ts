import { signal, Signal, WritableSignal } from '@angular/core';
import {
  addDaysToRoutineDate,
  calculateNextDueDate,
  CreateRoutineInput,
  Routine,
  RoutineDate,
  routineFrequencies,
} from '@gilles-monorepo/rituel-model';

export abstract class RoutineRepository {
  abstract readonly routines: Signal<readonly Routine[]>;

  abstract list(): readonly Routine[];
  abstract create(input: CreateRoutineInput): Routine;
  abstract complete(id: string, completionDate: RoutineDate): Routine;
  abstract deferUntilTomorrow(id: string, referenceDate: RoutineDate): Routine;
}

export class InMemoryRoutineRepository extends RoutineRepository {
  readonly routines: Signal<readonly Routine[]>;
  private readonly routineState: WritableSignal<readonly Routine[]>;

  constructor(
    currentDate: () => RoutineDate = getCurrentLocalDate,
    private readonly createId: () => string = () => crypto.randomUUID(),
  ) {
    super();
    this.routineState = signal(createSeedRoutines(currentDate()));
    this.routines = this.routineState.asReadonly();
  }

  list(): readonly Routine[] {
    return this.routineState();
  }

  create(input: CreateRoutineInput): Routine {
    const routine: Routine = { id: this.createId(), ...input };
    this.routineState.update((routines) => [...routines, routine]);
    return routine;
  }

  complete(id: string, completionDate: RoutineDate): Routine {
    const routine = this.findById(id);
    const completedRoutine: Routine = {
      ...routine,
      nextDueDate: calculateNextDueDate(completionDate, routine.frequency),
    };

    this.replace(completedRoutine);
    return completedRoutine;
  }

  deferUntilTomorrow(id: string, referenceDate: RoutineDate): Routine {
    const routine = this.findById(id);
    const deferredRoutine: Routine = {
      ...routine,
      nextDueDate: addDaysToRoutineDate(referenceDate, 1),
    };

    this.replace(deferredRoutine);
    return deferredRoutine;
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

function createSeedRoutines(today: RoutineDate): Routine[] {
  return [
    {
      id: 'routine-overdue',
      name: 'Clean the washing machine',
      note: 'Run the drum-clean cycle before the next load.',
      firstDueDate: addDaysToRoutineDate(today, -16),
      nextDueDate: addDaysToRoutineDate(today, -2),
      frequency: routineFrequencies.everyTwoWeeks,
    },
    {
      id: 'routine-due-today',
      name: 'Change the laundry',
      note: 'A small reset for the week ahead.',
      firstDueDate: addDaysToRoutineDate(today, -14),
      nextDueDate: today,
      frequency: routineFrequencies.everyTwoWeeks,
    },
    {
      id: 'routine-upcoming-coffee-machine',
      name: 'Deep clean the coffee machine',
      note: 'Use the descaling cycle.',
      firstDueDate: addDaysToRoutineDate(today, -27),
      nextDueDate: addDaysToRoutineDate(today, 3),
      frequency: routineFrequencies.monthly,
    },
    {
      id: 'routine-upcoming-fridge',
      name: 'Wipe the fridge shelves',
      note: 'Do it before the next grocery run.',
      firstDueDate: addDaysToRoutineDate(today, -80),
      nextDueDate: addDaysToRoutineDate(today, 9),
      frequency: routineFrequencies.everyThreeMonths,
    },
  ];
}

function getCurrentLocalDate(): RoutineDate {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
