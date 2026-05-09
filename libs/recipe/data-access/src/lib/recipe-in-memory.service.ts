import { BehaviorSubject, Observable, map, of } from 'rxjs';
import { Recipe } from '@gilles-monorepo/recipe-model';
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
      [
        { quantity: '200', unit: 'g', name: 'spaghetti' },
        { quantity: '100', unit: 'g', name: 'guanciale' },
        { quantity: '3', unit: '', name: "jaunes d'œuf" },
        { quantity: '50', unit: 'g', name: 'Pecorino Romano' },
        { quantity: '', unit: '', name: 'Poivre noir' },
      ],
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
        { quantity: '200', unit: 'g', name: 'spaghetti' },
        { quantity: '100', unit: 'g', name: 'guanciale' },
        { quantity: '3', unit: '', name: "jaunes d'œuf" },
        { quantity: '50', unit: 'g', name: 'Pecorino Romano' },
        { quantity: '', unit: '', name: 'Poivre noir' },
      ],
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
        { quantity: '500', unit: 'g', name: 'blanc de poulet' },
        { quantity: '200', unit: 'ml', name: 'yaourt' },
        { quantity: '400', unit: 'ml', name: 'coulis de tomates' },
        { quantity: '200', unit: 'ml', name: 'crème liquide' },
        { quantity: '1', unit: '', name: 'oignon' },
        { quantity: '3', unit: '', name: "gousses d'ail" },
        { quantity: '1', unit: 'c. à café', name: 'garam masala' },
        { quantity: '1', unit: 'c. à café', name: 'cumin' },
        { quantity: '1', unit: 'c. à café', name: 'curcuma' },
        { quantity: '1', unit: 'c. à café', name: 'paprika' },
        { quantity: '', unit: '', name: 'Coriandre fraîche' },
      ],
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
        { quantity: '2', unit: 'tranches', name: 'pain au levain' },
        { quantity: '1', unit: '', name: 'avocat mûr' },
        { quantity: '1', unit: '', name: 'citron' },
        { quantity: '', unit: '', name: 'Flocons de piment' },
        { quantity: '', unit: '', name: 'Sel et poivre' },
        { quantity: '2', unit: '', name: 'œufs (facultatif)' },
      ],
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
        { quantity: '3', unit: '', name: 'œufs' },
        { quantity: '1', unit: 'c. à soupe', name: 'beurre' },
        { quantity: '', unit: '', name: 'Sel et poivre' },
        { quantity: '', unit: '', name: 'Ciboulette fraîche' },
        { quantity: '', unit: '', name: 'Gruyère (facultatif)' },
      ],
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
