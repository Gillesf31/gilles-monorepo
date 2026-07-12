import { Observable } from 'rxjs';
import { Recipe } from '@gilles-monorepo/recipe-model';

export type NewRecipe = Pick<
  Recipe,
  'title' | 'ingredients' | 'instructions' | 'isWorkInProgress'
>;

export abstract class RecipeService {
  abstract getRecipes(): Observable<Recipe[]>;
  abstract getRecipe(id: string): Observable<Recipe | undefined>;
  abstract addRecipe(recipe: NewRecipe): Observable<Recipe>;
  abstract updateRecipe(id: string, recipe: NewRecipe): Observable<Recipe>;
  abstract deleteRecipe(id: string): Observable<void>;
}
