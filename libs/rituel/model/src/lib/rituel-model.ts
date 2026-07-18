/** A calendar date encoded as YYYY-MM-DD, with no time zone or time of day. */
export type RoutineDate = string;

export const routineFrequencies = {
  weekly: 'weekly',
  everyTwoWeeks: 'every-two-weeks',
  monthly: 'monthly',
  everyThreeMonths: 'every-three-months',
} as const;

export type RoutineFrequency =
  (typeof routineFrequencies)[keyof typeof routineFrequencies];

export type Routine = {
  id: string;
  name: string;
  note?: string;
  firstDueDate: RoutineDate;
  nextDueDate: RoutineDate;
  frequency: RoutineFrequency;
};

export type CreateRoutineInput = Omit<Routine, 'id'>;

export type RoutineDueState = 'overdue' | 'due-today' | 'upcoming';

export function classifyRoutineDueState(
  routine: Pick<Routine, 'nextDueDate'>,
  referenceDate: RoutineDate,
): RoutineDueState {
  const routineDate = toUtcDate(routine.nextDueDate);
  const today = toUtcDate(referenceDate);

  if (routineDate < today) {
    return 'overdue';
  }

  if (routineDate > today) {
    return 'upcoming';
  }

  return 'due-today';
}

export function calculateNextDueDate(
  completionDate: RoutineDate,
  frequency: RoutineFrequency,
): RoutineDate {
  const completedOn = toUtcDate(completionDate);

  switch (frequency) {
    case routineFrequencies.weekly:
      return formatUtcDate(addDays(completedOn, 7));
    case routineFrequencies.everyTwoWeeks:
      return formatUtcDate(addDays(completedOn, 14));
    case routineFrequencies.monthly:
      return formatUtcDate(addMonths(completedOn, 1));
    case routineFrequencies.everyThreeMonths:
      return formatUtcDate(addMonths(completedOn, 3));
  }
}

export function addDaysToRoutineDate(
  date: RoutineDate,
  days: number,
): RoutineDate {
  return formatUtcDate(addDays(toUtcDate(date), days));
}

function toUtcDate(value: RoutineDate): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    throw new RangeError(`Expected a YYYY-MM-DD date, received: ${value}`);
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RangeError(
      `Expected a valid YYYY-MM-DD date, received: ${value}`,
    );
  }

  return date;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const lastDayOfTargetMonth = new Date(
    Date.UTC(year, month + 1, 0),
  ).getUTCDate();

  return new Date(Date.UTC(year, month, Math.min(day, lastDayOfTargetMonth)));
}

function formatUtcDate(date: Date): RoutineDate {
  return date.toISOString().slice(0, 10);
}
