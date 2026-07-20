import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
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
  daily: 'Every day',
  weekly: 'Every week',
  'every-two-weeks': 'Every 2 weeks',
  monthly: 'Every month',
  'every-three-months': 'Every 3 months',
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
  styleUrl: './feature-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RituelDashboardComponent {
  private readonly repository = inject(RoutineRepository);
  private readonly today = getCurrentLocalDate();

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
      ? `${routineNames.length} routine${routineNames.length === 1 ? '' : 's'}: ${routineNames.join(', ')}`
      : 'No routines scheduled';

    return `${day.weekday} ${day.date}. ${schedule}.`;
  }

  protected async completeRoutine(id: string): Promise<void> {
    await this.repository.complete(id, this.today);
  }

  protected async deferRoutineUntilTomorrow(id: string): Promise<void> {
    await this.repository.deferUntilTomorrow(id, this.today);
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
      weekday: calendarDate.toLocaleDateString(undefined, {
        weekday: 'long',
        timeZone: 'UTC',
      }),
      dayOfMonth: String(calendarDate.getUTCDate()),
      isToday: date === this.today,
      routines,
    };
  }
}

function getCurrentLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
