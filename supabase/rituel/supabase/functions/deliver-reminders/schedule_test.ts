import { deepStrictEqual, strictEqual } from 'node:assert';
import { getLocalTime, isReminderDue } from './schedule.ts';

Deno.test(
  'reminders become due at the chosen minute and remain eligible afterward',
  () => {
    const routine = {
      next_due_date: '2026-09-13',
      notification_time: '08:30:00',
    };
    for (const [time, expected] of [
      ['08:29', false],
      ['08:30', true],
      ['19:15', true],
    ] as const) {
      strictEqual(
        isReminderDue(routine, { date: '2026-09-13', time }),
        expected,
      );
    }
    strictEqual(
      isReminderDue(routine, { date: '2026-09-12', time: '23:59' }),
      false,
    );
    strictEqual(
      isReminderDue(routine, { date: '2026-09-14', time: '08:29' }),
      false,
    );
    strictEqual(
      isReminderDue(routine, { date: '2026-09-14', time: '08:30' }),
      true,
    );
  },
);

Deno.test('each receiving device uses its own local date and time', () => {
  const now = new Date('2026-09-13T12:30:00Z');
  const toronto = getLocalTime('America/Toronto', now)!;
  const vancouver = getLocalTime('America/Vancouver', now)!;
  const routine = {
    next_due_date: '2026-09-13',
    notification_time: '08:30:00',
  };
  deepStrictEqual(toronto, { date: '2026-09-13', time: '08:30' });
  deepStrictEqual(vancouver, { date: '2026-09-13', time: '05:30' });
  strictEqual(isReminderDue(routine, toronto), true);
  strictEqual(isReminderDue(routine, vancouver), false);
  strictEqual(getLocalTime('Invalid/Zone', now), null);
});

Deno.test('midnight starts a new local delivery day', () => {
  const now = new Date('2026-09-14T04:00:00Z');
  const local = getLocalTime('America/Toronto', now)!;
  deepStrictEqual(local, { date: '2026-09-14', time: '00:00' });
  strictEqual(
    isReminderDue(
      { next_due_date: local.date, notification_time: '00:00:00' },
      local,
    ),
    true,
  );
  strictEqual(
    isReminderDue(
      { next_due_date: '2026-09-13', notification_time: '23:59:00' },
      local,
    ),
    false,
  );
  deepStrictEqual(getLocalTime('America/Vancouver', now), {
    date: '2026-09-13',
    time: '21:00',
  });
});

Deno.test(
  'a skipped spring time becomes eligible when the clock advances past it',
  () => {
    const routine = {
      next_due_date: '2026-03-08',
      notification_time: '02:30:00',
    };
    const before = getLocalTime(
      'America/Toronto',
      new Date('2026-03-08T06:59:00Z'),
    )!;
    const after = getLocalTime(
      'America/Toronto',
      new Date('2026-03-08T07:00:00Z'),
    )!;
    strictEqual(isReminderDue(routine, before), false);
    deepStrictEqual(after, { date: '2026-03-08', time: '03:00' });
    strictEqual(isReminderDue(routine, after), true);
  },
);

Deno.test('a repeated autumn time retains the same local delivery date', () => {
  const first = getLocalTime(
    'America/Toronto',
    new Date('2026-11-01T05:30:00Z'),
  )!;
  const repeated = getLocalTime(
    'America/Toronto',
    new Date('2026-11-01T06:30:00Z'),
  )!;
  deepStrictEqual(first, { date: '2026-11-01', time: '01:30' });
  deepStrictEqual(repeated, first);
  const routine = { next_due_date: first.date, notification_time: '01:30:00' };
  strictEqual(isReminderDue(routine, first), true);
  strictEqual(isReminderDue(routine, repeated), true);
});
