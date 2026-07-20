import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RoutineRepository } from '@gilles-monorepo/rituel-data-access';
import {
  Routine,
  RoutineFrequency,
  routineFrequencies,
} from '@gilles-monorepo/rituel-model';

const frequencyOptions: ReadonlyArray<{
  value: RoutineFrequency;
  label: string;
}> = [
  { value: routineFrequencies.daily, label: 'Chaque jour' },
  { value: routineFrequencies.weekly, label: 'Chaque semaine' },
  { value: routineFrequencies.everyTwoWeeks, label: 'Toutes les 2 semaines' },
  { value: routineFrequencies.monthly, label: 'Chaque mois' },
  { value: routineFrequencies.everyThreeMonths, label: 'Tous les 3 mois' },
];

@Component({
  selector: 'lib-feature-edit-task',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './feature-edit-task.html',
  styleUrl: './feature-edit-task.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditRoutineComponent implements OnInit {
  private readonly repository = inject(RoutineRepository);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private routine: Routine | undefined;

  protected readonly frequencyOptions = frequencyOptions;
  protected readonly submitted = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly isDeleteConfirmationVisible = signal(false);
  protected readonly saveError = signal<string | null>(null);

  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [requiredTrimmed],
    }),
    note: new FormControl('', { nonNullable: true }),
    nextDueDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    frequency: new FormControl<RoutineFrequency | null>(null, {
      validators: [Validators.required],
    }),
  });

  async ngOnInit(): Promise<void> {
    this.routine = await this.repository.get(
      this.route.snapshot.paramMap.get('id') ?? '',
    );

    if (!this.routine) {
      void this.router.navigateByUrl('/');
      return;
    }

    this.form.setValue({
      name: this.routine.name,
      note: this.routine.note ?? '',
      nextDueDate: this.routine.nextDueDate,
      frequency: this.routine.frequency,
    });
  }

  async submit(): Promise<void> {
    if (this.isSaving() || !this.routine) {
      return;
    }

    this.submitted.set(true);
    this.saveError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, note, nextDueDate, frequency } = this.form.getRawValue();

    if (!frequency) {
      return;
    }

    this.isSaving.set(true);

    try {
      await this.repository.update(this.routine.id, {
        ...this.routine,
        name: name.trim(),
        note: note.trim() || undefined,
        nextDueDate,
        frequency,
      });
      await this.router.navigateByUrl('/');
    } catch {
      this.saveError.set('Impossible d’enregistrer cette routine. Veuillez réessayer.');
    } finally {
      this.isSaving.set(false);
    }
  }

  protected showDeleteConfirmation(): void {
    this.isDeleteConfirmationVisible.set(true);
  }

  protected cancelDelete(): void {
    this.isDeleteConfirmationVisible.set(false);
  }

  async deleteRoutine(): Promise<void> {
    if (!this.routine || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.saveError.set(null);

    try {
      await this.repository.delete(this.routine.id);
      await this.router.navigateByUrl('/');
    } catch {
      this.saveError.set('Impossible de supprimer cette routine. Veuillez réessayer.');
    } finally {
      this.isSaving.set(false);
    }
  }
}

const requiredTrimmed: ValidatorFn = (control) =>
  String(control.value).trim() ? null : { required: true };
