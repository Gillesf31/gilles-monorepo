import type { Meta, StoryObj } from '@storybook/angular';
import {
  normalizeRecipeIngredients,
  Recipe,
} from '@gilles-monorepo/recipe-model';
import { RecipeCardComponent } from './recipe-card.component';

const meta: Meta<RecipeCardComponent> = {
  title: 'Recipe/RecipeCard',
  component: RecipeCardComponent,
};

export default meta;
type Story = StoryObj<RecipeCardComponent>;

const pastaRecipe = new Recipe(
  '1',
  'Pasta Carbonara',
  normalizeRecipeIngredients([
    '200g spaghetti',
    '100g guanciale',
    '3 egg yolks',
    '50g Pecorino Romano',
    'Black pepper',
  ]),
  [
    'Cook spaghetti in salted boiling water until al dente.',
    'Fry guanciale in a pan over medium heat until crispy.',
    'Mix egg yolks with grated Pecorino Romano and black pepper.',
    'Drain pasta, reserving a cup of pasta water.',
    'Combine pasta with guanciale off the heat.',
    'Add the egg mixture and toss vigorously to create a creamy sauce.',
  ],
);

export const Default: Story = {
  args: {
    recipe: pastaRecipe,
  },
};

export const WorkInProgress: Story = {
  args: {
    recipe: new Recipe(
      'work-in-progress',
      'Gâteau au citron',
      normalizeRecipeIngredients(['2 citrons', '200 g farine', '3 œufs']),
      ['Mélanger les ingrédients.', 'Cuire au four.'],
      true,
    ),
  },
};

export const FewIngredients: Story = {
  args: {
    recipe: new Recipe(
      '2',
      'Classic French Omelette',
      normalizeRecipeIngredients([
        '3 eggs',
        '1 tbsp butter',
        'Salt and pepper',
      ]),
      [
        'Beat eggs with salt and pepper.',
        'Melt butter in a pan over medium-high heat.',
        'Pour in eggs, stir gently until just set.',
        'Fold and slide onto a plate.',
      ],
    ),
  },
};

export const ManyIngredients: Story = {
  args: {
    recipe: new Recipe(
      '3',
      'Chicken Tikka Masala',
      normalizeRecipeIngredients([
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
      [
        'Marinate chicken in yogurt and spices for at least 1 hour.',
        'Grill or bake chicken until cooked through.',
        'Sauté onion and garlic until golden.',
        'Add spices and cook for 1 minute.',
        'Pour in tomato passata and simmer for 10 minutes.',
        'Stir in cream and add chicken.',
        'Simmer for 5 minutes and garnish with coriander.',
      ],
    ),
  },
};
