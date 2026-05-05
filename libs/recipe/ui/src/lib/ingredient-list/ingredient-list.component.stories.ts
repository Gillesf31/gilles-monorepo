import type { Meta, StoryObj } from '@storybook/angular';
import { normalizeRecipeIngredients } from '@gilles-monorepo/recipe-model';
import { IngredientListComponent } from './ingredient-list.component';

const meta: Meta<IngredientListComponent> = {
  title: 'Recipe/IngredientList',
  component: IngredientListComponent,
};

export default meta;
type Story = StoryObj<IngredientListComponent>;

export const Default: Story = {
  args: {
    ingredients: normalizeRecipeIngredients([
      '200g spaghetti',
      '100g guanciale',
      '3 egg yolks',
      '50g Pecorino Romano',
      'Black pepper',
    ]),
  },
};

export const FewIngredients: Story = {
  args: {
    ingredients: normalizeRecipeIngredients([
      '3 eggs',
      '1 tbsp butter',
      'Salt and pepper',
    ]),
  },
};

export const ManyIngredients: Story = {
  args: {
    ingredients: normalizeRecipeIngredients([
      '500g chicken breast',
      '200ml yogurt',
      '400ml tomato passata',
      '200ml cream',
      '1 onion',
      '3 garlic cloves',
      '1 tsp garam masala',
      '1 tsp cumin',
      '1 tsp turmeric',
      '1 tsp paprika',
      'Fresh coriander',
    ]),
  },
};
