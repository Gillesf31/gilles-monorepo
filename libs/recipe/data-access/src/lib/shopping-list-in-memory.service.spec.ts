import { firstValueFrom } from 'rxjs';
import { EMPTY_SHOPPING_LIST_STATE } from './shopping-list.service';
import { ShoppingListInMemoryService } from './shopping-list-in-memory.service';

describe(ShoppingListInMemoryService.name, () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves, restores, and clears the shopping list state', async () => {
    const service = new ShoppingListInMemoryService();

    await firstValueFrom(
      service.saveShoppingListState({
        selectedRecipeIds: ['recipe-1'],
        multipliersByRecipeId: { 'recipe-1': 2 },
        checkedItemIds: ['spaghetti::g'],
        customItems: [
          {
            id: 'custom-0',
            quantity: '2',
            unit: 'kg',
            name: 'farine',
            recipeTitles: ['Ajout manuel'],
          },
        ],
      }),
    );

    expect(await firstValueFrom(service.getShoppingListState())).toEqual({
      selectedRecipeIds: ['recipe-1'],
      multipliersByRecipeId: { 'recipe-1': 2 },
      checkedItemIds: ['spaghetti::g'],
      customItems: [
        {
          id: 'custom-0',
          quantity: '2',
          unit: 'kg',
          name: 'farine',
          recipeTitles: ['Ajout manuel'],
        },
      ],
    });

    const restoredService = new ShoppingListInMemoryService();
    expect(
      await firstValueFrom(restoredService.getShoppingListState()),
    ).toEqual(await firstValueFrom(service.getShoppingListState()));

    await firstValueFrom(restoredService.clearShoppingListState());

    expect(
      await firstValueFrom(restoredService.getShoppingListState()),
    ).toEqual(EMPTY_SHOPPING_LIST_STATE);
  });
});
