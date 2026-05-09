import { firstValueFrom } from 'rxjs';
import { RecipeInMemoryService } from './recipe-in-memory.service';

describe(RecipeInMemoryService.name, () => {
  it('adds, updates, and deletes recipes in memory', async () => {
    const service = new RecipeInMemoryService();
    const initialRecipes = await firstValueFrom(service.getRecipes());

    const created = await firstValueFrom(
      service.addRecipe({
        title: 'Crêpes',
        ingredients: [{ name: 'Farine', quantity: '250', unit: 'g' }],
        instructions: ['Mélanger les ingrédients.'],
      }),
    );

    expect(await firstValueFrom(service.getRecipe(created.id))).toEqual(
      created,
    );
    expect(await firstValueFrom(service.getRecipes())).toHaveLength(
      initialRecipes.length + 1,
    );

    const updated = await firstValueFrom(
      service.updateRecipe(created.id, {
        title: 'Crêpes fines',
        ingredients: created.ingredients,
        instructions: created.instructions,
      }),
    );

    expect(updated.title).toBe('Crêpes fines');

    await firstValueFrom(service.deleteRecipe(created.id));

    expect(await firstValueFrom(service.getRecipe(created.id))).toBeUndefined();
  });
});
