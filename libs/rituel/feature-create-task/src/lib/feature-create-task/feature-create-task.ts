import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RoutineRepository } from '@gilles-monorepo/rituel-data-access';
import {
  RoutineDate,
  RoutineFrequency,
  routineFrequencies,
} from '@gilles-monorepo/rituel-model';

const frequencyOptions: ReadonlyArray<{
  value: RoutineFrequency;
  label: string;
}> = [
  { value: routineFrequencies.weekly, label: 'Every week' },
  { value: routineFrequencies.everyTwoWeeks, label: 'Every 2 weeks' },
  { value: routineFrequencies.monthly, label: 'Every month' },
  { value: routineFrequencies.everyThreeMonths, label: 'Every 3 months' },
];

@Component({
  selector: 'lib-feature-create-task',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './feature-create-task.html',
  styleUrl: './feature-create-task.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateRoutineComponent {
  private readonly repository = inject(RoutineRepository);
  private readonly router = inject(Router);

  protected readonly frequencyOptions = frequencyOptions;
  protected readonly submitted = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [requiredTrimmed],
    }),
    note: new FormControl('', { nonNullable: true }),
    firstDueDate: new FormControl(getCurrentLocalDate(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    frequency: new FormControl<RoutineFrequency | null>(null, {
      validators: [Validators.required],
    }),
  });

  async submit(): Promise<void> {
    if (this.isSaving()) {
      return;
    }

    this.submitted.set(true);
    this.saveError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, note, firstDueDate, frequency } = this.form.getRawValue();

    if (!frequency) {
      return;
    }

    this.isSaving.set(true);

    try {
      this.repository.create({
        name: name.trim(),
        note: note.trim() || undefined,
        firstDueDate,
        nextDueDate: firstDueDate,
        frequency,
      });
      await this.router.navigateByUrl('/');
    } catch {
      this.saveError.set('Unable to save this routine. Please try again.');
    } finally {
      this.isSaving.set(false);
    }
  }
}

const requiredTrimmed: ValidatorFn = (control) =>
  String(control.value).trim() ? null : { required: true };

function getCurrentLocalDate(): RoutineDate {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
