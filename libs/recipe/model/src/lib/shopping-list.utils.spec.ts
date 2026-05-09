import { Recipe } from './recipe.model';
import { createShoppingListItems } from './shopping-list.utils';

describe('shopping list items', () => {
  it('merges ingredients with the same name and unit across selected recipes', () => {
    const carbonara = new Recipe(
      'carbonara',
      'Carbonara',
      [
        { quantity: '200', unit: 'g', name: 'Spaghetti' },
        { quantity: '2', unit: '', name: 'oeufs' },
      ],
      [],
    );
    const bolognaise = new Recipe(
      'bolognaise',
      'Bolognaise',
      [
        { quantity: '300', unit: 'g', name: 'spaghetti' },
        { quantity: '1', unit: '', name: 'Oeufs' },
      ],
      [],
    );

    expect(
      createShoppingListItems([
        { recipe: carbonara, multiplier: 1 },
        { recipe: bolognaise, multiplier: 2 },
      ]),
    ).toEqual([
      {
        id: 'oeufs::',
        name: 'oeufs',
        quantity: '4',
        unit: '',
        recipeTitles: ['Bolognaise', 'Carbonara'],
      },
      {
        id: 'spaghetti::g',
        name: 'Spaghetti',
        quantity: '800',
        unit: 'g',
        recipeTitles: ['Bolognaise', 'Carbonara'],
      },
    ]);
  });

  it('keeps free-text quantities separate', () => {
    const cake = new Recipe(
      'cake',
      'Cake',
      [{ quantity: 'une pincée', unit: '', name: 'sel' }],
      [],
    );
    const bread = new Recipe(
      'bread',
      'Pain',
      [{ quantity: 'au goût', unit: '', name: 'sel' }],
      [],
    );

    expect(
      createShoppingListItems([
        { recipe: cake, multiplier: 1 },
        { recipe: bread, multiplier: 1 },
      ]),
    ).toEqual([
      {
        id: 'bread-0',
        name: 'sel',
        quantity: 'au goût',
        unit: '',
        recipeTitles: ['Pain'],
      },
      {
        id: 'cake-0',
        name: 'sel',
        quantity: 'une pincée',
        unit: '',
        recipeTitles: ['Cake'],
      },
    ]);
  });

  it('preserves comma decimal formatting for merged quantities', () => {
    const soup = new Recipe(
      'soup',
      'Soupe',
      [{ quantity: '1,5', unit: 'l', name: 'bouillon' }],
      [],
    );

    expect(
      createShoppingListItems([{ recipe: soup, multiplier: 2 }])[0],
    ).toEqual({
      id: 'bouillon::l',
      name: 'bouillon',
      quantity: '3',
      unit: 'l',
      recipeTitles: ['Soupe'],
    });
  });
});
