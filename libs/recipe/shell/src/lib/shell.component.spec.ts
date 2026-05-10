import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppVersionService } from '@gilles-monorepo/feature-app-version';
import { ThemeService } from '@gilles-monorepo/feature-theme';
import { ShellComponent } from './shell.component';

describe(ShellComponent.name, () => {
  it('initializes the theme service and renders shell outlets', () => {
    const init = vi.fn();

    const fixture = TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: ThemeService,
          useValue: {
            init,
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

    expect(init).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  });
});
