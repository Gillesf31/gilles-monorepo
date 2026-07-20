import {
  calculateNextDueDate,
  classifyRoutineDueState,
  routineFrequencies,
} from './rituel-model';

describe('classifyRoutineDueState', () => {
  const referenceDate = '2026-07-18';

  it.each([
    ['overdue', '2026-07-17'],
    ['due-today', '2026-07-18'],
    ['upcoming', '2026-07-19'],
  ] as const)('classifies a %s routine', (expectedState, nextDueDate) => {
    expect(classifyRoutineDueState({ nextDueDate }, referenceDate)).toBe(
      expectedState,
    );
  });
});

describe('calculateNextDueDate', () => {
  it.each([
    [routineFrequencies.daily, '2026-07-19'],
    [routineFrequencies.weekly, '2026-07-25'],
    [routineFrequencies.everyTwoWeeks, '2026-08-01'],
    [routineFrequencies.monthly, '2026-08-18'],
    [routineFrequencies.everyThreeMonths, '2026-10-18'],
  ] as const)(
    'calculates the next %s routine from its completion date',
    (frequency, expectedDate) => {
      expect(calculateNextDueDate('2026-07-18', frequency)).toBe(expectedDate);
    },
  );

  it('uses the last valid day of the target month for a monthly routine', () => {
    expect(calculateNextDueDate('2025-01-31', routineFrequencies.monthly)).toBe(
      '2025-02-28',
    );
  });

  it('keeps leap-day month ends valid for a three-month routine', () => {
    expect(
      calculateNextDueDate('2024-11-30', routineFrequencies.everyThreeMonths),
    ).toBe('2025-02-28');
  });
});
