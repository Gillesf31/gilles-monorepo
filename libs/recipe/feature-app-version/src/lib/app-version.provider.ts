import { HttpClient, provideHttpClient } from '@angular/common/http';
import {
  Injectable,
  NgZone,
  computed,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
  signal,
} from '@angular/core';
import {
  EMPTY,
  Observable,
  catchError,
  exhaustMap,
  filter,
  fromEvent,
  map,
  merge,
  of,
  tap,
} from 'rxjs';

type AppVersion = {
  version?: string;
  builtAt?: string;
  commit?: string | null;
};

@Injectable({ providedIn: 'root' })
export class AppVersionService {
  private readonly http = inject(HttpClient);
  private readonly zone = inject(NgZone);
  private readonly storageKey = 'recipe-app-version';
  private readonly dismissedStorageKey = 'recipe-app-version-dismissed';
  private readonly pendingVersion = signal<string | null>(null);
  private started = false;

  readonly updateAvailable = computed(() => !!this.pendingVersion());

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;

    this.zone.runOutsideAngular(() => {
      merge(
        of(null),
        fromEvent(document, 'visibilitychange').pipe(
          filter(() => document.visibilityState === 'visible'),
        ),
        fromEvent(window, 'focus'),
      )
        .pipe(
          exhaustMap(() => this.fetchVersion()),
          filter((version): version is string => !!version),
          tap((version) => {
            this.zone.run(() => {
              this.applyVersion(version);
            });
          }),
        )
        .subscribe();
    });
  }

  updateNow(): void {
    const version = this.pendingVersion();

    if (!version) {
      return;
    }

    localStorage.setItem(this.storageKey, version);
    this.reloadWithFreshUrl(version);
  }

  dismissUpdate(): void {
    const version = this.pendingVersion();

    if (!version) {
      return;
    }

    localStorage.setItem(this.dismissedStorageKey, version);
    this.pendingVersion.set(null);
  }

  private applyVersion(remoteVersion: string): void {
    try {
      const currentVersion = localStorage.getItem(this.storageKey);

      if (!currentVersion) {
        localStorage.setItem(this.storageKey, remoteVersion);
        return;
      }

      if (currentVersion !== remoteVersion) {
        const dismissedVersion = localStorage.getItem(this.dismissedStorageKey);

        if (dismissedVersion !== remoteVersion) {
          this.pendingVersion.set(remoteVersion);
        }
      }
    } catch {
      // Version checks should never block using the installed app.
    }
  }

  private fetchVersion(): Observable<string | null> {
    return this.http
      .get<AppVersion>('/version.json', {
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
        },
        params: {
          t: Date.now(),
        },
      })
      .pipe(
        map(
          (appVersion) =>
            appVersion.version ??
            appVersion.commit ??
            appVersion.builtAt ??
            null,
        ),
        catchError(() => EMPTY),
      );
  }

  private reloadWithFreshUrl(version: string): void {
    const url = new URL(window.location.href);

    url.searchParams.set('appVersion', version);
    window.location.replace(url.toString());
  }
}

export function provideAppVersionCheck() {
  return makeEnvironmentProviders([
    provideHttpClient(),
    provideEnvironmentInitializer(() => {
      inject(AppVersionService).start();
    }),
  ]);
}
