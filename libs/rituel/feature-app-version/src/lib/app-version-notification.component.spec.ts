import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { AppVersionNotificationComponent } from './app-version-notification.component';
import { AppVersionService } from './app-version.provider';

describe('AppVersionNotificationComponent', () => {
  it('lets the person using Rituel update when a version is available', async () => {
    const updateNow = vi.fn();
    const dismissUpdate = vi.fn();
    const fixture: ComponentFixture<AppVersionNotificationComponent> =
      TestBed.configureTestingModule({
        imports: [AppVersionNotificationComponent],
        providers: [
          {
            provide: AppVersionService,
            useValue: {
              updateAvailable: signal(true),
              updateNow,
              dismissUpdate,
            },
          },
        ],
      }).createComponent(AppVersionNotificationComponent);

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Nouvelle version disponible',
    );

    fixture.nativeElement.querySelector('button').click();

    expect(updateNow).toHaveBeenCalledOnce();
    expect(dismissUpdate).not.toHaveBeenCalled();
  });
});
