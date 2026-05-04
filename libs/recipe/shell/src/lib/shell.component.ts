import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppVersionNotificationComponent } from '@gilles-monorepo/app-version';
import { ThemeService, ThemeToggleComponent } from '@gilles-monorepo/ui-theme';

@Component({
  selector: 'gilles-monorepo-shell',
  imports: [RouterOutlet, ThemeToggleComponent, AppVersionNotificationComponent],
  template: `
    <router-outlet />
    <gilles-monorepo-app-version-notification />
    <gilles-monorepo-theme-toggle />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent implements OnInit {
  private readonly themeService = inject(ThemeService);

  ngOnInit(): void {
    this.themeService.init();
  }
}
