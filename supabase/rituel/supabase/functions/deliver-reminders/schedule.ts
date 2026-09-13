type LocalTime = { date: string; time: string };

export function isReminderDue(
  routine: { next_due_date: string; notification_time: string },
  localTime: LocalTime,
): boolean {
  return (
    routine.next_due_date <= localTime.date &&
    routine.notification_time.slice(0, 5) <= localTime.time
  );
}

export function getLocalTime(timeZone: string, now: Date): LocalTime | null {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value;
    const year = value('year');
    const month = value('month');
    const day = value('day');
    const hour = value('hour');
    const minute = value('minute');

    if (!year || !month || !day || !hour || !minute) {
      return null;
    }
    return {
      date: `${year}-${month}-${day}`,
      time: `${hour}:${minute}`,
    };
  } catch {
    console.error('Ignoring invalid Push subscription time zone', timeZone);
    return null;
  }
}
