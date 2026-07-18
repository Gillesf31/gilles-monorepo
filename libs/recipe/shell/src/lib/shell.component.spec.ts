import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppVersionService } from '@gilles-monorepo/feature-app-version';
import { ThemeService } from '@gilles-monorepo/feature-theme';
import { ShellComponent } from './shell.component';

describe(ShellComponent.name, () => {
  it('renders shell outlets and the shared theme toggle', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: ThemeService,
          useValue: {
            toggle: vi.fn(),
            isDark: signal(false),
          },
        },
        {
          provide: AppVersionService,
          useValue: {
            updateAvailable: signal(false),
            updateNow: vi.fn(),
            dismissUpdate: vi.fn(),
          },
        },
      ],
    }).createComponent(ShellComponent);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('gilles-monorepo-theme-toggle'),
    ).not.toBeNull();
  });
});
