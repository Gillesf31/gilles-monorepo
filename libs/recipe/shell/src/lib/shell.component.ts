import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService, ThemeToggleComponent } from '@gilles-monorepo/ui-theme';

@Component({
  selector: 'gilles-monorepo-shell',
  imports: [RouterOutlet, ThemeToggleComponent],
  template: `
    <router-outlet />
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
