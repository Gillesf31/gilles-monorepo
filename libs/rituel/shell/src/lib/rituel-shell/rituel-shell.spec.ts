import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  InMemoryRoutineRepository,
  RoutineRepository,
} from '@gilles-monorepo/rituel-data-access';
import { RituelShellComponent } from './rituel-shell';
import { provideRituelShell } from './rituel-shell.providers';

describe('RituelShellComponent', () => {
  let component: RituelShellComponent;
  let fixture: ComponentFixture<RituelShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RituelShellComponent],
      providers: [provideRouter([]), provideRituelShell()],
    }).compileComponents();

    fixture = TestBed.createComponent(RituelShellComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('provides the in-memory routine repository', () => {
    expect(TestBed.inject(RoutineRepository)).toBeInstanceOf(
      InMemoryRoutineRepository,
    );
  });
});
