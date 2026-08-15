import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { SUPABASE_CLIENT } from '@gilles-monorepo/util-supabase';
import { RecipeApiService } from './recipe-api.service';

interface QueryMock {
  select: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  throwOnError: ReturnType<typeof vi.fn>;
}

function createQueryMock(data: unknown): QueryMock {
  const query = {
    select: vi.fn(),
    order: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    throwOnError: vi.fn().mockResolvedValue({ data }),
  } satisfies QueryMock;

  query.select.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.update.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.single.mockReturnValue(query);

  return query;
}

describe(RecipeApiService.name, () => {
  it('maps the persisted pin state when loading recipes', async () => {
    const query = createQueryMock([
      {
        id: 'recipe-1',
        title: 'Soupe',
        ingredients: [],
        instructions: [],
        is_work_in_progress: false,
        is_pinned: true,
      },
    ]);
    const service = TestBed.configureTestingModule({
      providers: [
        RecipeApiService,
        {
          provide: SUPABASE_CLIENT,
          useValue: { from: vi.fn().mockReturnValue(query) },
        },
      ],
    }).inject(RecipeApiService);

    const recipes = await firstValueFrom(service.getRecipes());

    expect(recipes[0].isPinned).toBe(true);
  });

  it('persists and returns a changed pin state', async () => {
    const query = createQueryMock({
      id: 'recipe-1',
      title: 'Soupe',
      ingredients: [],
      instructions: [],
      is_work_in_progress: false,
      is_pinned: true,
    });
    const service = TestBed.configureTestingModule({
      providers: [
        RecipeApiService,
        {
          provide: SUPABASE_CLIENT,
          useValue: { from: vi.fn().mockReturnValue(query) },
        },
      ],
    }).inject(RecipeApiService);

    const recipe = await firstValueFrom(service.setPinned('recipe-1', true));

    expect(query.update).toHaveBeenCalledWith({ is_pinned: true });
    expect(query.eq).toHaveBeenCalledWith('id', 'recipe-1');
    expect(recipe.isPinned).toBe(true);
  });
});
