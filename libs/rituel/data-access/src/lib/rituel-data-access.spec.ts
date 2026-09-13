import { createClient } from '@supabase/supabase-js';
import {
  BrowserPushClient,
  BrowserPushNotificationService,
  InMemoryRoutineRepository,
  PushSubscriptionServerGateway,
  RoutineServerGateway,
  RoutineRepository,
  SerializedPushSubscription,
  ServerRoutineRepository,
  SupabaseRoutineGateway,
} from './rituel-data-access';
import {
  CreateRoutineInput,
  Routine,
  UpdateRoutineInput,
} from '@gilles-monorepo/rituel-model';

describe('InMemoryRoutineRepository', () => {
  const today = '2026-07-18';

  function createRepository(): RoutineRepository {
    return new InMemoryRoutineRepository(
      () => today,
      () => 'routine-new',
    );
  }

  it('exposes stable seed ids for two overdue, two due, and two upcoming routines', async () => {
    const repository = createRepository();

    expect((await repository.list()).map((routine) => routine.id)).toEqual([
      'routine-overdue',
      'routine-overdue-bathroom',
      'routine-due-today',
      'routine-due-today-bathroom',
      'routine-upcoming-coffee-machine',
      'routine-upcoming-fridge',
    ]);
    expect(
      repository.routines().filter((routine) => routine.nextDueDate < today),
    ).toHaveLength(2);
    expect(
      repository.routines().filter((routine) => routine.nextDueDate === today),
    ).toHaveLength(2);
  });

  it('creates a routine, generates its id, and updates reactive state', async () => {
    const repository = createRepository();

    const created = await repository.create({
      name: 'Water the plants',
      firstDueDate: '2026-07-20',
      nextDueDate: '2026-07-20',
      notificationTime: '19:15',
      frequency: 'weekly',
    });

    expect(created.id).toBe('routine-new');
    expect(repository.routines()).toContainEqual(created);
    expect((await repository.get(created.id))?.notificationTime).toBe('19:15');
    expect(
      (await repository.complete(created.id, today)).notificationTime,
    ).toBe('19:15');
    expect(
      (await repository.deferUntilTomorrow(created.id, today)).notificationTime,
    ).toBe('19:15');
  });

  it('updates a routine and removes a routine by id', async () => {
    const repository = createRepository();
    const existing = (await repository.list())[0];

    const updated = await repository.update(existing.id, {
      ...existing,
      name: 'Clean the dryer',
      frequency: 'monthly',
    });

    expect(updated).toEqual({
      ...existing,
      name: 'Clean the dryer',
      frequency: 'monthly',
    });
    expect(await repository.get(existing.id)).toEqual(updated);

    await repository.delete(existing.id);

    expect(await repository.get(existing.id)).toBeUndefined();
  });

  it('calculates the next due date from completion rather than the prior due date', async () => {
    const repository = createRepository();

    const completed = await repository.complete(
      'routine-due-today',
      '2026-07-18',
    );

    expect(completed.firstDueDate).toBe('2026-07-04');
    expect(completed.nextDueDate).toBe('2026-08-01');
    expect(
      (await repository.list()).find((routine) => routine.id === completed.id),
    ).toEqual(completed);
  });

  it('defers only the current next due date until tomorrow', async () => {
    const repository = createRepository();
    const beforeDeferral = (await repository.list())[0];

    const deferred = await repository.deferUntilTomorrow(
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

describe('ServerRoutineRepository', () => {
  it('persists create, update, complete, defer, and delete through its server gateway', async () => {
    const gateway = new FakeRoutineServerGateway();
    const repository = new ServerRoutineRepository(gateway);

    const created = await repository.create({
      name: 'Water the plants',
      firstDueDate: '2026-07-20',
      nextDueDate: '2026-07-20',
      notificationTime: '19:15',
      frequency: 'weekly',
    });
    expect((await repository.get(created.id))?.notificationTime).toBe('19:15');
    const updated = await repository.update(created.id, {
      ...created,
      name: 'Water the balcony plants',
      notificationTime: '07:45',
    });
    const completed = await repository.complete(updated.id, '2026-07-20');
    expect(completed.notificationTime).toBe('07:45');
    const deferred = await repository.deferUntilTomorrow(
      completed.id,
      '2026-07-21',
    );

    expect(gateway.householdIds).toEqual(['household-1']);
    expect(deferred).toMatchObject({
      id: created.id,
      name: 'Water the balcony plants',
      nextDueDate: '2026-07-22',
      notificationTime: '07:45',
    });
    expect(repository.routines()).toContainEqual(deferred);

    await repository.delete(created.id);

    expect(await repository.get(created.id)).toBeUndefined();
    expect(repository.routines()).not.toContainEqual(deferred);
  });
});

describe('SupabaseRoutineGateway', () => {
  it('writes the notification time and normalizes it on every read path', async () => {
    let row = {
      id: 'routine-1',
      household_id: 'household-1',
      name: 'Water the plants',
      note: null,
      first_due_date: '2026-09-13',
      next_due_date: '2026-09-13',
      notification_time: '08:00:00',
      frequency: 'weekly',
    };
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe('/rest/v1/routines');
      expect(url.searchParams.get('select')?.split(',')).toContain(
        'notification_time',
      );
      if (init?.method === 'POST' || init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body));
        expect(body.notification_time).toMatch(/^\d{2}:\d{2}$/);
        row = {
          ...row,
          ...body,
          notification_time: `${body.notification_time}:00`,
        };
      }
      const single =
        new Headers(init?.headers).get('Accept') ===
        'application/vnd.pgrst.object+json';
      return Response.json(single ? row : [row]);
    });
    const client = createClient('https://rituel.example.test', 'test-key', {
      global: { fetch: fetchMock },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const gateway = new SupabaseRoutineGateway(client);
    const created = await gateway.createRoutine('household-1', {
      name: 'Water the plants',
      firstDueDate: '2026-09-13',
      nextDueDate: '2026-09-13',
      frequency: 'weekly',
      notificationTime: '19:15',
    });
    expect(created.notificationTime).toBe('19:15');
    expect(row.notification_time).toBe('19:15:00');
    expect(
      (await gateway.listRoutines('household-1'))[0].notificationTime,
    ).toBe('19:15');
    expect(
      (await gateway.getRoutine('household-1', created.id))?.notificationTime,
    ).toBe('19:15');
    expect(
      (
        await gateway.updateRoutine('household-1', created.id, {
          ...created,
          notificationTime: '07:45',
        })
      ).notificationTime,
    ).toBe('07:45');
    expect(row.notification_time).toBe('07:45:00');
  });
});

describe('BrowserPushNotificationService', () => {
  it('subscribes, stores the local time zone, and sends an immediate test', async () => {
    const pushClient = new FakeBrowserPushClient();
    const gateway = new FakePushSubscriptionServerGateway();
    const service = new BrowserPushNotificationService(
      pushClient,
      gateway,
      'vapid-public-key',
      () => 'America/Toronto',
    );

    await service.enableAndSendTest();

    expect(pushClient.serverPublicKeys).toEqual(['vapid-public-key']);
    expect(gateway.saved).toEqual([
      { subscription: fakeSubscription, timeZone: 'America/Toronto' },
    ]);
    expect(gateway.testCalls).toBe(1);
    expect(service.state()).toBe('enabled');
    expect(service.message()).toBe('Notification de test envoyée.');
  });

  it('reports unsupported browsers without requesting permission', async () => {
    const pushClient = new FakeBrowserPushClient(false);
    const service = new BrowserPushNotificationService(
      pushClient,
      new FakePushSubscriptionServerGateway(),
      'vapid-public-key',
    );

    await service.enableAndSendTest();

    expect(service.state()).toBe('unsupported');
    expect(pushClient.serverPublicKeys).toEqual([]);
  });
});

const fakeSubscription: SerializedPushSubscription = {
  endpoint: 'https://push.example.test/subscription',
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
};

class FakeBrowserPushClient implements BrowserPushClient {
  readonly serverPublicKeys: string[] = [];
  private subscription: SerializedPushSubscription | null = null;

  constructor(readonly isEnabled = true) {}

  async getSubscription(): Promise<SerializedPushSubscription | null> {
    return this.subscription;
  }

  async subscribe(
    serverPublicKey: string,
  ): Promise<SerializedPushSubscription> {
    this.serverPublicKeys.push(serverPublicKey);
    this.subscription = fakeSubscription;
    return fakeSubscription;
  }
}

class FakePushSubscriptionServerGateway
  implements PushSubscriptionServerGateway
{
  readonly saved: Array<{
    subscription: SerializedPushSubscription;
    timeZone: string;
  }> = [];
  testCalls = 0;

  async save(
    subscription: SerializedPushSubscription,
    timeZone: string,
  ): Promise<void> {
    this.saved.push({ subscription, timeZone });
  }

  async sendTest(): Promise<void> {
    this.testCalls += 1;
  }
}


class FakeRoutineServerGateway implements RoutineServerGateway {
  readonly householdIds: string[] = [];
  private routines: Routine[] = [];
  private sequence = 0;

  async getHouseholdId(): Promise<string> {
    this.householdIds.push('household-1');
    return 'household-1';
  }

  async listRoutines(): Promise<readonly Routine[]> {
    return this.routines;
  }

  async getRoutine(
    _householdId: string,
    id: string,
  ): Promise<Routine | undefined> {
    return this.routines.find((routine) => routine.id === id);
  }

  async createRoutine(
    _householdId: string,
    input: CreateRoutineInput,
  ): Promise<Routine> {
    const routine = { ...input, id: `routine-${++this.sequence}` };
    this.routines.push(routine);
    return routine;
  }

  async updateRoutine(
    _householdId: string,
    id: string,
    input: UpdateRoutineInput,
  ): Promise<Routine> {
    const routine = { ...input, id };
    this.routines = this.routines.map((item) =>
      item.id === id ? routine : item,
    );
    return routine;
  }

  async deleteRoutine(_householdId: string, id: string): Promise<void> {
    this.routines = this.routines.filter((routine) => routine.id !== id);
  }
}
