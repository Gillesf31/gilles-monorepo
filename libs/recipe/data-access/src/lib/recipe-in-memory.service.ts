import { BehaviorSubject, Observable, map, of } from 'rxjs';
import {
  normalizeRecipeIngredients,
  Recipe,
} from '@gilles-monorepo/recipe-model';
import { NewRecipe, RecipeService } from './recipe.service';

// ─── Dev scenario ────────────────────────────────────────────────────────────
// Change this line to switch between local test scenarios.
const ACTIVE_SCENARIO: keyof typeof SCENARIOS = 'default';
// ─────────────────────────────────────────────────────────────────────────────

const SCENARIOS = {
  empty: [],

  single: [
    new Recipe(
      '1',
      'Pasta Carbonara',
      normalizeRecipeIngredients([
        '200g de spaghetti',
        '100g de guanciale',
        "3 jaunes d'œuf",
        '50g de Pecorino Romano',
        'Poivre noir',
      ]),
      [
        "Faire cuire les spaghetti dans de l'eau bouillante salée jusqu'à ce qu'ils soient al dente.",
        "Faire revenir le guanciale à feu moyen jusqu'à ce qu'il soit croustillant.",
        "Mélanger les jaunes d'œuf avec le Pecorino Romano râpé et une généreuse quantité de poivre noir.",
        "Égoutter les pâtes en réservant une tasse d'eau de cuisson.",
        'Mélanger les pâtes avec le guanciale hors du feu.',
        "Ajouter le mélange aux œufs et remuer vigoureusement en ajoutant progressivement l'eau de cuisson pour obtenir une sauce crémeuse.",
      ],
    ),
  ],

  default: [
    new Recipe(
      '1',
      'Pasta Carbonara',
      [
        '200g de spaghetti',
        '100g de guanciale',
        "3 jaunes d'œuf",
        '50g de Pecorino Romano',
        'Poivre noir',
      ].map((ingredient) => ({ name: ingredient, quantity: '', unit: '' })),
      [
        "Faire cuire les spaghetti dans de l'eau bouillante salée jusqu'à ce qu'ils soient al dente.",
        "Faire revenir le guanciale à feu moyen jusqu'à ce qu'il soit croustillant.",
        "Mélanger les jaunes d'œuf avec le Pecorino Romano râpé et une généreuse quantité de poivre noir.",
        "Égoutter les pâtes en réservant une tasse d'eau de cuisson.",
        'Mélanger les pâtes avec le guanciale hors du feu.',
        "Ajouter le mélange aux œufs et remuer vigoureusement en ajoutant progressivement l'eau de cuisson pour obtenir une sauce crémeuse.",
      ],
    ),
    new Recipe(
      '2',
      'Poulet Tikka Masala',
      [
        '500g de blanc de poulet',
        '200ml de yaourt',
        '400ml de coulis de tomates',
        '200ml de crème liquide',
        '1 oignon',
        "3 gousses d'ail",
        '1 c. à café de garam masala',
        '1 c. à café de cumin',
        '1 c. à café de curcuma',
        '1 c. à café de paprika',
        'Coriandre fraîche',
      ].map((ingredient) => ({ name: ingredient, quantity: '', unit: '' })),
      [
        'Faire mariner le poulet dans le yaourt et les épices pendant au moins 1 heure.',
        "Griller ou cuire le poulet au four à 200°C jusqu'à ce qu'il soit cuit.",
        "Faire revenir l'oignon et l'ail finement hachés dans l'huile jusqu'à ce qu'ils soient tendres et dorés.",
        "Ajouter les épices sèches et cuire 1 minute jusqu'à ce qu'elles embaument.",
        'Verser le coulis de tomates et laisser mijoter 10 minutes.',
        'Incorporer la crème, puis ajouter les morceaux de poulet.',
        'Laisser mijoter encore 5 minutes et garnir de coriandre fraîche.',
      ],
    ),
    new Recipe(
      '3',
      "Toast à l'avocat",
      [
        '2 tranches de pain au levain',
        '1 avocat mûr',
        '1 citron',
        'Flocons de piment',
        'Sel et poivre',
        '2 œufs (facultatif)',
      ].map((ingredient) => ({ name: ingredient, quantity: '', unit: '' })),
      [
        "Faire griller les tranches de pain jusqu'à ce qu'elles soient dorées et croustillantes.",
        "Couper l'avocat en deux, retirer le noyau et récupérer la chair dans un bol.",
        'Écraser avec le jus de citron, le sel et le poivre selon la texture souhaitée.',
        "Étaler généreusement l'avocat sur le pain grillé.",
        "Garnir de flocons de piment et d'un œuf poché ou frit si désiré.",
      ],
    ),
    new Recipe(
      '4',
      'Omelette française',
      [
        '3 œufs',
        '1 c. à soupe de beurre',
        'Sel et poivre',
        'Ciboulette fraîche',
        'Gruyère (facultatif)',
      ].map((ingredient) => ({ name: ingredient, quantity: '', unit: '' })),
      [
        "Casser les œufs dans un bol, assaisonner de sel et de poivre, et battre jusqu'à obtenir un mélange lisse.",
        'Faire fondre le beurre dans une poêle antiadhésive à feu moyen-vif.',
        'Verser les œufs et remuer doucement avec une spatule en secouant la poêle.',
        'Lorsque les œufs sont juste pris mais encore brillants sur le dessus, replier un côté.',
        'Faire glisser dans une assiette côté replié vers le bas et garnir de ciboulette.',
      ],
    ),
  ],
} satisfies Record<string, Recipe[]>;

export class RecipeInMemoryService extends RecipeService {
  private readonly recipes$ = new BehaviorSubject<Recipe[]>(
    SCENARIOS[ACTIVE_SCENARIO],
  );

  getRecipes(): Observable<Recipe[]> {
    return this.recipes$.asObservable();
  }

  getRecipe(id: string): Observable<Recipe | undefined> {
    return this.recipes$.pipe(
      map((recipes) => recipes.find((r) => r.id === id)),
    );
  }

  updateRecipe(id: string, recipe: NewRecipe): Observable<Recipe> {
    const updated = new Recipe(
      id,
      recipe.title,
      recipe.ingredients,
      recipe.instructions,
    );
    this.recipes$.next(
      this.recipes$.value.map((r) => (r.id === id ? updated : r)),
    );
    return of(updated);
  }

  addRecipe(recipe: NewRecipe): Observable<Recipe> {
    const newRecipe = new Recipe(
      crypto.randomUUID(),
      recipe.title,
      recipe.ingredients,
      recipe.instructions,
    );
    this.recipes$.next([...this.recipes$.value, newRecipe]);
    return of(newRecipe);
  }

  deleteRecipe(id: string): Observable<void> {
    this.recipes$.next(this.recipes$.value.filter((r) => r.id !== id));
    return of(undefined);
  }
}
