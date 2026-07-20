import { signal, Signal, WritableSignal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import type { SupabaseClient } from '@supabase/supabase-js';
import { firstValueFrom } from 'rxjs';
import {
  addDaysToRoutineDate,
  calculateNextDueDate,
  CreateRoutineInput,
  Routine,
  RoutineDate,
  RoutineFrequency,
  UpdateRoutineInput,
  routineFrequencies,
} from '@gilles-monorepo/rituel-model';

export abstract class RoutineRepository {
  abstract readonly routines: Signal<readonly Routine[]>;

  abstract list(): Promise<readonly Routine[]>;
  abstract get(id: string): Promise<Routine | undefined>;
  abstract create(input: CreateRoutineInput): Promise<Routine>;
  abstract update(
    id: string,
    input: UpdateRoutineInput,
  ): Promise<Routine>;
  abstract delete(id: string): Promise<void>;
  abstract complete(
    id: string,
    completionDate: RoutineDate,
  ): Promise<Routine>;
  abstract deferUntilTomorrow(
    id: string,
    referenceDate: RoutineDate,
  ): Promise<Routine>;
}

export type PushNotificationState =
  | 'checking'
  | 'unsupported'
  | 'ready'
  | 'enabling'
  | 'enabled'
  | 'denied'
  | 'error';

export type SerializedPushSubscription = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export abstract class PushNotificationService {
  abstract readonly state: Signal<PushNotificationState>;
  abstract readonly message: Signal<string>;

  abstract enableAndSendTest(): Promise<void>;
  abstract sendTest(): Promise<void>;
}

export interface BrowserPushClient {
  readonly isEnabled: boolean;

  getSubscription(): Promise<SerializedPushSubscription | null>;
  subscribe(serverPublicKey: string): Promise<SerializedPushSubscription>;
}

export interface PushSubscriptionServerGateway {
  save(
    subscription: SerializedPushSubscription,
    timeZone: string,
  ): Promise<void>;
  sendTest(): Promise<void>;
}

export class AngularServiceWorkerPushClient implements BrowserPushClient {
  constructor(private readonly swPush: SwPush) {}

  get isEnabled(): boolean {
    return this.swPush.isEnabled;
  }

  async getSubscription(): Promise<SerializedPushSubscription | null> {
    const subscription = await firstValueFrom(this.swPush.subscription);
    return subscription ? serializePushSubscription(subscription) : null;
  }

  async subscribe(
    serverPublicKey: string,
  ): Promise<SerializedPushSubscription> {
    const subscription = await this.swPush.requestSubscription({
      serverPublicKey,
    });
    return serializePushSubscription(subscription);
  }
}

export class BrowserPushNotificationService extends PushNotificationService {
  private readonly stateValue = signal<PushNotificationState>('checking');
  private readonly messageValue = signal('');
  private readonly initialization: Promise<void>;

  readonly state = this.stateValue.asReadonly();
  readonly message = this.messageValue.asReadonly();

  constructor(
    private readonly pushClient: BrowserPushClient,
    private readonly gateway: PushSubscriptionServerGateway,
    private readonly serverPublicKey: string,
    private readonly timeZone: () => string = () =>
      Intl.DateTimeFormat().resolvedOptions().timeZone,
  ) {
    super();
    this.initialization = this.checkExistingSubscription();
  }

  async enableAndSendTest(): Promise<void> {
    await this.initialization;

    if (!this.pushClient.isEnabled) {
      this.stateValue.set('unsupported');
      return;
    }

    this.stateValue.set('enabling');
    this.messageValue.set('Waiting for notification permission…');

    try {
      const subscription =
        (await this.pushClient.getSubscription()) ??
        (await this.pushClient.subscribe(this.serverPublicKey));
      await this.gateway.save(subscription, this.timeZone());
      this.stateValue.set('enabled');
      await this.sendTest();
    } catch (error) {
      const denied = isPermissionDenied(error);
      this.stateValue.set(denied ? 'denied' : 'error');
      this.messageValue.set(
        denied
          ? 'Notifications are blocked in this browser.'
          : 'Rituel could not enable reminders. Please try again.',
      );
    }
  }

  async sendTest(): Promise<void> {
    this.messageValue.set('Sending a test notification…');

    try {
      await this.gateway.sendTest();
      this.messageValue.set('Test notification sent.');
    } catch {
      this.messageValue.set(
        'Reminders are enabled, but the test notification could not be sent.',
      );
    }
  }

  private async checkExistingSubscription(): Promise<void> {
    if (!this.pushClient.isEnabled) {
      this.stateValue.set('unsupported');
      return;
    }

    try {
      const subscription = await this.pushClient.getSubscription();
      this.stateValue.set(subscription ? 'enabled' : 'ready');

      if (subscription) {
        await this.gateway.save(subscription, this.timeZone());
      }
    } catch {
      this.stateValue.set('error');
      this.messageValue.set('Rituel could not check notification support.');
    }
  }
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

  async list(): Promise<readonly Routine[]> {
    return this.routineState();
  }

  async get(id: string): Promise<Routine | undefined> {
    return this.routineState().find((routine) => routine.id === id);
  }

  async create(input: CreateRoutineInput): Promise<Routine> {
    const routine: Routine = { id: this.createId(), ...input };
    this.routineState.update((routines) => [...routines, routine]);
    return routine;
  }

  async update(id: string, input: UpdateRoutineInput): Promise<Routine> {
    this.findById(id);
    const routine: Routine = { id, ...input };
    this.replace(routine);
    return routine;
  }

  async delete(id: string): Promise<void> {
    this.findById(id);
    this.routineState.update((routines) =>
      routines.filter((routine) => routine.id !== id),
    );
  }

  async complete(
    id: string,
    completionDate: RoutineDate,
  ): Promise<Routine> {
    const routine = this.findById(id);
    const completedRoutine: Routine = {
      ...routine,
      nextDueDate: calculateNextDueDate(completionDate, routine.frequency),
    };

    this.replace(completedRoutine);
    return completedRoutine;
  }

  async deferUntilTomorrow(
    id: string,
    referenceDate: RoutineDate,
  ): Promise<Routine> {
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

/** The narrow server boundary used by the reactive routine repository. */
export interface RoutineServerGateway {
  getHouseholdId(): Promise<string>;
  listRoutines(householdId: string): Promise<readonly Routine[]>;
  getRoutine(
    householdId: string,
    id: string,
  ): Promise<Routine | undefined>;
  createRoutine(
    householdId: string,
    input: CreateRoutineInput,
  ): Promise<Routine>;
  updateRoutine(
    householdId: string,
    id: string,
    input: UpdateRoutineInput,
  ): Promise<Routine>;
  deleteRoutine(householdId: string, id: string): Promise<void>;
}

/**
 * The durable implementation of the routine contract. It keeps the same
 * reactive signal as the in-memory version while storing mutations remotely.
 */
export class ServerRoutineRepository extends RoutineRepository {
  readonly routines: Signal<readonly Routine[]>;
  private readonly routineState: WritableSignal<readonly Routine[]> = signal(
    [],
  );
  private householdIdPromise: Promise<string> | undefined;

  constructor(private readonly gateway: RoutineServerGateway) {
    super();
    this.routines = this.routineState.asReadonly();
  }

  async list(): Promise<readonly Routine[]> {
    const routines = await this.gateway.listRoutines(await this.householdId());
    this.routineState.set(routines);
    return routines;
  }

  async get(id: string): Promise<Routine | undefined> {
    const routine = await this.gateway.getRoutine(await this.householdId(), id);

    if (routine) {
      this.replace(routine);
    }

    return routine;
  }

  async create(input: CreateRoutineInput): Promise<Routine> {
    const routine = await this.gateway.createRoutine(
      await this.householdId(),
      input,
    );
    this.routineState.update((routines) => [...routines, routine]);
    return routine;
  }

  async update(id: string, input: UpdateRoutineInput): Promise<Routine> {
    const routine = await this.gateway.updateRoutine(
      await this.householdId(),
      id,
      input,
    );
    this.replace(routine);
    return routine;
  }

  async delete(id: string): Promise<void> {
    await this.gateway.deleteRoutine(await this.householdId(), id);
    this.routineState.update((routines) =>
      routines.filter((routine) => routine.id !== id),
    );
  }

  async complete(
    id: string,
    completionDate: RoutineDate,
  ): Promise<Routine> {
    const routine = await this.requireRoutine(id);
    return this.update(id, {
      ...routine,
      nextDueDate: calculateNextDueDate(completionDate, routine.frequency),
    });
  }

  async deferUntilTomorrow(
    id: string,
    referenceDate: RoutineDate,
  ): Promise<Routine> {
    const routine = await this.requireRoutine(id);
    return this.update(id, {
      ...routine,
      nextDueDate: addDaysToRoutineDate(referenceDate, 1),
    });
  }

  private async householdId(): Promise<string> {
    this.householdIdPromise ??= this.gateway.getHouseholdId();

    try {
      return await this.householdIdPromise;
    } catch (error) {
      this.householdIdPromise = undefined;
      throw error;
    }
  }

  private async requireRoutine(id: string): Promise<Routine> {
    const routine = await this.get(id);

    if (!routine) {
      throw new Error(`Routine not found: ${id}`);
    }

    return routine;
  }

  private replace(updatedRoutine: Routine): void {
    this.routineState.update((routines) => {
      const exists = routines.some((routine) => routine.id === updatedRoutine.id);

      return exists
        ? routines.map((routine) =>
            routine.id === updatedRoutine.id ? updatedRoutine : routine,
          )
        : [...routines, updatedRoutine];
    });
  }
}

/** Supabase adapter for the durable Rituel routine repository. */
export class SupabaseRoutineGateway implements RoutineServerGateway {
  constructor(private readonly client: SupabaseClient) {}

  async getHouseholdId(): Promise<string> {
    await this.ensureAnonymousSession();
    const { data, error } = await this.client.rpc('ensure_rituel_household');
    if (error) {
      throw error;
    }

    return toHouseholdId(data);
  }

  async listRoutines(householdId: string): Promise<readonly Routine[]> {
    const { data, error } = await this.client
      .from('routines')
      .select('id, name, note, first_due_date, next_due_date, frequency')
      .eq('household_id', householdId)
      .order('next_due_date');
    if (error) {
      throw error;
    }

    return (data ?? []).map(toRoutine);
  }

  async getRoutine(
    householdId: string,
    id: string,
  ): Promise<Routine | undefined> {
    const { data, error } = await this.client
      .from('routines')
      .select('id, name, note, first_due_date, next_due_date, frequency')
      .eq('household_id', householdId)
      .eq('id', id)
      .maybeSingle();
    if (error) {
      throw error;
    }

    return data ? toRoutine(data) : undefined;
  }

  async createRoutine(
    householdId: string,
    input: CreateRoutineInput,
  ): Promise<Routine> {
    const { data, error } = await this.client
      .from('routines')
      .insert({ household_id: householdId, ...toRoutineRow(input) })
      .select('id, name, note, first_due_date, next_due_date, frequency')
      .single();
    if (error) {
      throw error;
    }

    return toRoutine(data);
  }

  async updateRoutine(
    householdId: string,
    id: string,
    input: UpdateRoutineInput,
  ): Promise<Routine> {
    const { data, error } = await this.client
      .from('routines')
      .update(toRoutineRow(input))
      .eq('household_id', householdId)
      .eq('id', id)
      .select('id, name, note, first_due_date, next_due_date, frequency')
      .single();
    if (error) {
      throw error;
    }

    return toRoutine(data);
  }

  async deleteRoutine(householdId: string, id: string): Promise<void> {
    const { error } = await this.client
      .from('routines')
      .delete()
      .eq('household_id', householdId)
      .eq('id', id);
    if (error) {
      throw error;
    }
  }

  private async ensureAnonymousSession(): Promise<void> {
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (user) {
      return;
    }

    const { data, error } = await this.client.auth.signInAnonymously();
    if (error || !data.user) {
      throw error ?? new Error('Unable to create an anonymous Rituel session');
    }
  }
}

export class SupabasePushSubscriptionGateway
  implements PushSubscriptionServerGateway
{
  private householdIdPromise: Promise<string> | undefined;

  constructor(private readonly client: SupabaseClient) {}

  async save(
    subscription: SerializedPushSubscription,
    timeZone: string,
  ): Promise<void> {
    const { error } = await this.client.from('push_subscriptions').upsert(
      {
        household_id: await this.householdId(),
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        time_zone: timeZone,
      },
      { onConflict: 'endpoint' },
    );

    if (error) {
      throw error;
    }
  }

  async sendTest(): Promise<void> {
    const { error } = await this.client.functions.invoke(
      'send-test-notification',
      { body: {} },
    );

    if (error) {
      throw error;
    }
  }

  private async householdId(): Promise<string> {
    this.householdIdPromise ??= new SupabaseRoutineGateway(
      this.client,
    ).getHouseholdId();

    try {
      return await this.householdIdPromise;
    } catch (error) {
      this.householdIdPromise = undefined;
      throw error;
    }
  }
}

type HouseholdRow = {
  id: string;
};

function toHouseholdId(data: HouseholdRow[] | HouseholdRow | null): string {
  const row = Array.isArray(data) ? data[0] : data;

  if (!row?.id) {
    throw new Error('Rituel could not determine this household');
  }

  return row.id;
}

type RoutineRow = {
  id: string;
  name: string;
  note: string | null;
  first_due_date: string;
  next_due_date: string;
  frequency: RoutineFrequency;
};

function toRoutine(row: RoutineRow): Routine {
  return {
    id: row.id,
    name: row.name,
    note: row.note ?? undefined,
    firstDueDate: row.first_due_date,
    nextDueDate: row.next_due_date,
    frequency: row.frequency,
  };
}

function toRoutineRow(input: CreateRoutineInput | UpdateRoutineInput) {
  return {
    name: input.name,
    note: input.note ?? null,
    first_due_date: input.firstDueDate,
    next_due_date: input.nextDueDate,
    frequency: input.frequency,
  };
}

function serializePushSubscription(
  subscription: PushSubscription,
): SerializedPushSubscription {
  const serialized = subscription.toJSON();
  const endpoint = serialized.endpoint;
  const p256dh = serialized.keys?.['p256dh'];
  const auth = serialized.keys?.['auth'];

  if (!endpoint || !p256dh || !auth) {
    throw new Error('The browser returned an incomplete Push subscription');
  }

  return { endpoint, keys: { p256dh, auth } };
}

function isPermissionDenied(error: unknown): boolean {
  return (
    typeof DOMException !== 'undefined' &&
    error instanceof DOMException &&
    error.name === 'NotAllowedError'
  );
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
