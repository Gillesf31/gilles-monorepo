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

  protected readonly week = [
    { label: 'M', active: false },
    { label: 'T', active: false },
    { label: 'W', active: true },
    { label: 'T', active: false },
    { label: 'F', active: true },
    { label: 'S', active: false },
    { label: 'S', active: false },
  ];

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
}

function getCurrentLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
