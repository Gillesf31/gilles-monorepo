import {
  InMemoryRoutineRepository,
  RoutineRepository,
} from './rituel-data-access';

describe('InMemoryRoutineRepository', () => {
  const today = '2026-07-18';

  function createRepository(): RoutineRepository {
    return new InMemoryRoutineRepository(
      () => today,
      () => 'routine-new',
    );
  }

  it('exposes stable seed ids for one overdue, one due, and two upcoming routines', () => {
    const repository = createRepository();

    expect(repository.list().map((routine) => routine.id)).toEqual([
      'routine-overdue',
      'routine-due-today',
      'routine-upcoming-coffee-machine',
      'routine-upcoming-fridge',
    ]);
    expect(repository.routines()[1].nextDueDate).toBe(today);
  });

  it('creates a routine, generates its id, and updates reactive state', () => {
    const repository = createRepository();

    const created = repository.create({
      name: 'Water the plants',
      firstDueDate: '2026-07-20',
      nextDueDate: '2026-07-20',
      frequency: 'weekly',
    });

    expect(created.id).toBe('routine-new');
    expect(repository.routines()).toContainEqual(created);
  });

  it('calculates the next due date from completion rather than the prior due date', () => {
    const repository = createRepository();

    const completed = repository.complete('routine-due-today', '2026-07-18');

    expect(completed.firstDueDate).toBe('2026-07-04');
    expect(completed.nextDueDate).toBe('2026-08-01');
    expect(
      repository.list().find((routine) => routine.id === completed.id),
    ).toEqual(completed);
  });

  it('defers only the current next due date until tomorrow', () => {
    const repository = createRepository();
    const beforeDeferral = repository.list()[0];

    const deferred = repository.deferUntilTomorrow(
      beforeDeferral.id,
      '2026-07-18',
    );

    expect(deferred).toEqual({
      ...beforeDeferral,
      nextDueDate: '2026-07-19',
    });
    expect(
      repository.routines().find((routine) => routine.id === deferred.id),
    ).toEqual(deferred);
  });
});
