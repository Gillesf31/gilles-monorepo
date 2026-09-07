import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Recipe } from '@gilles-monorepo/recipe-model';
import { firstValueFrom } from 'rxjs';
import { RecipeApiService } from './recipe-api.service';

const recipe = new Recipe(
  '63d96021-6aad-401f-87f5-2d055ffdb512',
  'Soupe',
  [{ name: 'Tomate', quantity: '4', unit: '' }],
  ['Mijoter.'],
  false,
  true,
);
const url = `/api/recipes/${recipe.id}`;
const body = {
  title: recipe.title,
  ingredients: recipe.ingredients,
  instructions: recipe.instructions,
  isWorkInProgress: false,
};

describe(RecipeApiService.name, () => {
  let service: RecipeApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RecipeApiService,
      ],
    });
    service = TestBed.inject(RecipeApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('loads the catalogue and detail using the API contract', async () => {
    const list = firstValueFrom(service.getRecipes());
    http.expectOne({ method: 'GET', url: '/api/recipes' }).flush([recipe]);
    expect(await list).toEqual([recipe]);
    const detail = firstValueFrom(service.getRecipe(recipe.id));
    http.expectOne({ method: 'GET', url }).flush(recipe);
    expect(await detail).toEqual(recipe);
  });

  it('sends only editable fields for creation and replacement', async () => {
    const created = firstValueFrom(service.addRecipe(recipe));
    const post = http.expectOne({ method: 'POST', url: '/api/recipes' });
    expect(post.request.body).toEqual(body);
    post.flush(recipe, { status: 201, statusText: 'Created' });
    expect(await created).toEqual(recipe);
    const updated = firstValueFrom(service.updateRecipe(recipe.id, recipe));
    const put = http.expectOne({ method: 'PUT', url });
    expect(put.request.body).toEqual(body);
    put.flush(recipe);
    expect(await updated).toEqual(recipe);
  });

  it.each([true, false])('sets pin status to %s', async (isPinned) => {
    const result = firstValueFrom(service.setPinned(recipe.id, isPinned));
    const patch = http.expectOne({ method: 'PATCH', url: `${url}/pin` });
    expect(patch.request.body).toEqual({ isPinned });
    patch.flush({ ...recipe, isPinned });
    expect(await result).toEqual({ ...recipe, isPinned });
  });

  it('maps an empty deletion response to void', async () => {
    const result = firstValueFrom(service.deleteRecipe(recipe.id));
    http
      .expectOne({ method: 'DELETE', url })
      .flush(null, { status: 204, statusText: 'No Content' });
    expect(await result).toBeUndefined();
  });

  it('maps only a detail 404 to a missing recipe', async () => {
    const missing = firstValueFrom(service.getRecipe(recipe.id));
    http
      .expectOne(url)
      .flush(
        { message: 'Recipe not found' },
        { status: 404, statusText: 'Not Found' },
      );
    expect(await missing).toBeUndefined();
    const failed = firstValueFrom(service.getRecipe(recipe.id));
    const assertion = expect(failed).rejects.toMatchObject({ status: 503 });
    http.expectOne(url).flush({}, { status: 503, statusText: 'Unavailable' });
    await assertion;
  });

  it('propagates write failures instead of reporting success', async () => {
    const result = firstValueFrom(service.updateRecipe(recipe.id, recipe));
    const assertion = expect(result).rejects.toMatchObject({ status: 400 });
    http
      .expectOne(url)
      .flush(
        { message: 'Invalid recipe' },
        { status: 400, statusText: 'Bad Request' },
      );
    await assertion;
  });

  it('encodes IDs as one path segment', async () => {
    const result = firstValueFrom(service.getRecipe('a/b?c'));
    http.expectOne('/api/recipes/a%2Fb%3Fc').flush(recipe);
    expect(await result).toEqual(recipe);
  });
});
