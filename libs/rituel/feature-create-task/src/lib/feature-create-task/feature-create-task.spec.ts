import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import {
  InMemoryRoutineRepository,
  RoutineRepository,
} from '@gilles-monorepo/rituel-data-access';
import { routineFrequencies } from '@gilles-monorepo/rituel-model';
import { CreateRoutineComponent } from './feature-create-task';

describe('CreateRoutineComponent', () => {
  const today = getCurrentLocalDate();
  let component: CreateRoutineComponent;
  let fixture: ComponentFixture<CreateRoutineComponent>;
  let repository: InMemoryRoutineRepository;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    repository = new InMemoryRoutineRepository(
      () => today,
      () => 'routine-new',
    );

    await TestBed.configureTestingModule({
      imports: [CreateRoutineComponent],
      providers: [
        provideRouter([]),
        { provide: RoutineRepository, useValue: repository },
      ],
    }).compileComponents();

    navigateByUrl = vi
      .spyOn(TestBed.inject(Router), 'navigateByUrl')
      .mockResolvedValue(true);
    fixture = TestBed.createComponent(CreateRoutineComponent);
    component = fixture.componentInstance;
  });

  it('defaults the first due date to local today', () => {
    expect(component.form.controls.firstDueDate.value).toBe(today);
  });

  it('shows validation errors and does not save an incomplete routine', async () => {
    await component.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Donnez un nom à cette routine',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'Choisissez la fréquence de répétition de cette routine',
    );
    expect(await repository.list()).toHaveLength(4);
  });

  it('trims and saves a valid routine before returning to the dashboard', async () => {
    component.form.setValue({
      name: '  Water the plants  ',
      note: '  Use the rain barrel.  ',
      firstDueDate: '2026-07-20',
      frequency: routineFrequencies.weekly,
    });

    await component.submit();

    expect((await repository.list()).at(-1)).toEqual({
      id: 'routine-new',
      name: 'Water the plants',
      note: 'Use the rain barrel.',
      firstDueDate: '2026-07-20',
      nextDueDate: '2026-07-20',
      frequency: routineFrequencies.weekly,
    });
    expect(navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('shows the server error when saving fails', async () => {
    vi.spyOn(repository, 'create').mockRejectedValue(
      new Error('Your session is no longer valid'),
    );
    component.form.setValue({
      name: 'Clean the dryer',
      note: '',
      firstDueDate: '2026-07-20',
      frequency: routineFrequencies.monthly,
    });

    await component.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Impossible d’enregistrer cette routine : Your session is no longer valid',
    );
  });
});

function getCurrentLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
