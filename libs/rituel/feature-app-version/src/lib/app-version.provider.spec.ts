import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { AppVersionService } from './app-version.provider';

describe('AppVersionService', () => {
  let service: AppVersionService;
  let httpTesting: HttpTestingController;

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('offers an update when Rituel returns to the foreground after a deployment', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AppVersionService);
    httpTesting = TestBed.inject(HttpTestingController);

    service.start();
    expectVersionCheck().flush({ version: 'first-release' });

    window.dispatchEvent(new Event('focus'));
    expectVersionCheck().flush({ version: 'next-release' });

    expect(service.updateAvailable()).toBe(true);
  });

  function expectVersionCheck() {
    return httpTesting.expectOne(
      (request) =>
        request.url === '/version.json' && request.params.has('t'),
    );
  }
});
