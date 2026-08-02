import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Routine,
  RoutineDueState,
  RoutineFrequency,
  classifyRoutineDueState,
  getRoutineWeekDates,
} from '@gilles-monorepo/rituel-model';
import {
  PushNotificationService,
  RoutineRepository,
} from '@gilles-monorepo/rituel-data-access';

const frequencyLabels: Record<RoutineFrequency, string> = {
  daily: 'Chaque jour',
  weekly: 'Chaque semaine',
  'every-two-weeks': 'Toutes les 2 semaines',
  monthly: 'Chaque mois',
  'every-three-months': 'Tous les 3 mois',
};

type RoutineWeekDay = {
  readonly date: string;
  readonly weekday: string;
  readonly dayOfMonth: string;
  readonly isToday: boolean;
  readonly routines: readonly Routine[];
};

@Component({
  selector: 'lib-feature-dashboard',
  imports: [RouterLink],
  templateUrl: './feature-dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RituelDashboardComponent {
  private readonly repository = inject(RoutineRepository);
  private readonly today = getCurrentLocalDate();
  private readonly pendingRoutineAction = signal<RoutineAction | null>(null);

  protected readonly notifications = inject(PushNotificationService, {
    optional: true,
  });
  protected readonly hasRoutines = computed(
    () => this.repository.routines().length > 0,
  );

  protected readonly week = computed(() => {
    const routinesByDate = new Map<string, Routine[]>();

    for (const routine of this.repository.routines()) {
      const routines = routinesByDate.get(routine.nextDueDate) ?? [];
      routines.push(routine);
      routinesByDate.set(routine.nextDueDate, routines);
    }

    return getRoutineWeekDates(this.today).map((date) =>
      this.toWeekDay(date, routinesByDate.get(date) ?? []),
    );
  });

  protected readonly overdue = computed(() =>
    this.routinesWithDueState('overdue'),
  );
  protected readonly dueToday = computed(() =>
    this.routinesWithDueState('due-today'),
  );
  protected readonly upcoming = computed(() =>
    this.routinesWithDueState('upcoming'),
  );

  constructor() {
    void this.loadRoutines();
  }

  protected frequencyLabel(frequency: RoutineFrequency): string {
    return frequencyLabels[frequency];
  }

  protected weekDayLabel(day: RoutineWeekDay): string {
    const routineNames = day.routines.map((routine) => routine.name);
    const schedule = routineNames.length
      ? `${routineNames.length} routine${routineNames.length === 1 ? '' : 's'} : ${routineNames.join(', ')}`
      : 'Aucune routine prévue';

    return `${day.weekday} ${day.date}. ${schedule}.`;
  }

  protected weekDayClasses(day: RoutineWeekDay): string {
    const stateColor =
      day.routines.length || day.isToday
        ? 'text-rituel-ink-strong dark:text-rituel-dark-ink-strong'
        : 'text-rituel-subtle dark:text-rituel-dark-subtle';

    return `grid justify-items-center gap-[0.35rem] text-[0.72rem] font-bold ${stateColor}`;
  }

  protected weekDayBadgeClasses(day: RoutineWeekDay): string {
    const stateClasses = day.routines.length
      ? 'border-rituel-accent dark:border-rituel-dark-accent bg-rituel-accent dark:bg-rituel-dark-accent text-rituel-action-text dark:text-rituel-dark-action-text shadow-[0_0_0_4px_#f6c9b8] dark:shadow-[0_0_0_4px_#633b32]'
      : day.isToday
        ? 'border-rituel-accent dark:border-rituel-dark-accent'
        : 'border-rituel-cadence-dot dark:border-rituel-dark-cadence-dot';

    return `grid h-[1.2rem] w-[1.2rem] place-items-center rounded-full border-2 text-[0.62rem] not-italic ${stateClasses}`;
  }

  protected isCompleting(routineId: string): boolean {
    return this.pendingRoutineAction()?.type === 'complete' &&
      this.pendingRoutineAction()?.routineId === routineId;
  }

  protected isDeferring(routineId: string): boolean {
    return this.pendingRoutineAction()?.type === 'defer' &&
      this.pendingRoutineAction()?.routineId === routineId;
  }

  protected isRoutineActionPending(routineId: string): boolean {
    return this.pendingRoutineAction()?.routineId === routineId;
  }

  protected async completeRoutine(id: string): Promise<void> {
    await this.runRoutineAction(id, 'complete', () =>
      this.repository.complete(id, this.today),
    );
  }

  protected async deferRoutineUntilTomorrow(id: string): Promise<void> {
    await this.runRoutineAction(id, 'defer', () =>
      this.repository.deferUntilTomorrow(id, this.today),
    );
  }

  protected async enableNotifications(): Promise<void> {
    await this.notifications?.enableAndSendTest();
  }

  protected async sendTestNotification(): Promise<void> {
    await this.notifications?.sendTest();
  }

  private async loadRoutines(): Promise<void> {
    await this.repository.list();
  }

  private async runRoutineAction(
    routineId: string,
    type: RoutineAction['type'],
    action: () => Promise<unknown>,
  ): Promise<void> {
    if (this.pendingRoutineAction()) {
      return;
    }

    this.pendingRoutineAction.set({ routineId, type });
    try {
      await action();
    } finally {
      this.pendingRoutineAction.set(null);
    }
  }

  private routinesWithDueState(state: RoutineDueState): readonly Routine[] {
    return this.repository
      .routines()
      .filter(
        (routine) => classifyRoutineDueState(routine, this.today) === state,
      );
  }

  private toWeekDay(
    date: string,
    routines: readonly Routine[],
  ): RoutineWeekDay {
    const calendarDate = new Date(`${date}T00:00:00Z`);

    return {
      date,
      weekday: calendarDate.toLocaleDateString('fr-CA', {
        weekday: 'long',
        timeZone: 'UTC',
      }),
      dayOfMonth: String(calendarDate.getUTCDate()),
      isToday: date === this.today,
      routines,
    };
  }
}

type RoutineAction = {
  routineId: string;
  type: 'complete' | 'defer';
};

function getCurrentLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
