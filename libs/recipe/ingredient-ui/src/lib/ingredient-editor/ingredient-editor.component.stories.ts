import { Component, Input, OnChanges, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import {
  IngredientEditorComponent,
  type EditableIngredient,
} from './ingredient-editor.component';

@Component({
  selector: 'gilles-monorepo-ingredient-editor-story',
  imports: [IngredientEditorComponent],
  template: `
    <div class="max-w-4xl bg-zinc-50 p-6 dark:bg-zinc-950">
      <gilles-monorepo-ingredient-editor
        [ingredients]="ingredients()"
        [units]="units"
        (ingredientsChange)="ingredients.set($event)"
      />
    </div>
  `,
})
class IngredientEditorStoryComponent implements OnChanges {
  @Input() initialIngredients: EditableIngredient[] = [];
  @Input() units: string[] = [
    '',
    'g',
    'kg',
    'ml',
    'l',
    'c. à café',
    'c. à soupe',
    'tasse',
    'pincée',
    'pièce',
  ];

  protected readonly ingredients = signal<EditableIngredient[]>([]);

  ngOnChanges(): void {
    this.ingredients.set(
      this.initialIngredients.map((ingredient) => ({ ...ingredient })),
    );
  }
}

const meta: Meta<IngredientEditorStoryComponent> = {
  title: 'Recipe/IngredientEditor',
  component: IngredientEditorStoryComponent,
};

export default meta;
type Story = StoryObj<IngredientEditorStoryComponent>;

export const EmptyNameOnly: Story = {
  args: {
    initialIngredients: [{ quantity: '', unit: '', name: '' }],
  },
};

export const TypicalRecipe: Story = {
  args: {
    initialIngredients: [
      { quantity: '200', unit: 'g', name: 'spaghetti' },
      { quantity: '100', unit: 'g', name: 'guanciale' },
      { quantity: '3', unit: 'pièce', name: "jaunes d'œuf" },
      { quantity: '50', unit: 'g', name: 'Pecorino Romano' },
      { quantity: '', unit: '', name: 'Poivre noir' },
    ],
  },
};

export const OptionalQuantities: Story = {
  args: {
    initialIngredients: [
      { quantity: '', unit: '', name: 'Sel' },
      { quantity: '', unit: '', name: 'Poivre' },
      { quantity: '1', unit: 'pincée', name: 'Flocons de piment' },
      { quantity: '', unit: '', name: 'Coriandre fraîche' },
    ],
  },
};

export const ManyIngredients: Story = {
  args: {
    initialIngredients: [
      { quantity: '500', unit: 'g', name: 'blanc de poulet' },
      { quantity: '200', unit: 'ml', name: 'yaourt' },
      { quantity: '400', unit: 'ml', name: 'coulis de tomates' },
      { quantity: '200', unit: 'ml', name: 'crème liquide' },
      { quantity: '1', unit: 'pièce', name: 'oignon' },
      { quantity: '3', unit: 'pièce', name: "gousses d'ail" },
      { quantity: '1', unit: 'c. à café', name: 'garam masala' },
      { quantity: '1', unit: 'c. à café', name: 'cumin' },
      { quantity: '1', unit: 'c. à café', name: 'curcuma' },
      { quantity: '1', unit: 'c. à café', name: 'paprika' },
      { quantity: '', unit: '', name: 'Coriandre fraîche' },
    ],
  },
};
