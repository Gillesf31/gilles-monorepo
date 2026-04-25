import type { Meta, StoryObj } from '@storybook/angular';
import { BtnComponent } from './btn.component';

const meta: Meta<BtnComponent> = {
  title: 'Recipe/Btn',
  component: BtnComponent,
};

export default meta;
type Story = StoryObj<BtnComponent>;

export const Primary: Story = {
  render: () => ({
    template: `<button gillesMonorepoBtn>Enregistrer la recette</button>`,
  }),
};

export const PrimaryLarge: Story = {
  render: () => ({
    template: `<button gillesMonorepoBtn size="lg" class="w-full">Enregistrer la recette</button>`,
  }),
};

export const Secondary: Story = {
  render: () => ({
    template: `<button gillesMonorepoBtn variant="secondary">Annuler</button>`,
  }),
};

export const Danger: Story = {
  render: () => ({
    template: `<button gillesMonorepoBtn variant="danger">Supprimer</button>`,
  }),
};

export const DangerFilled: Story = {
  render: () => ({
    template: `<button gillesMonorepoBtn variant="danger-filled">Supprimer</button>`,
  }),
};

export const Ghost: Story = {
  render: () => ({
    template: `<button gillesMonorepoBtn variant="ghost" size="sm">+ Ajouter un ingrédient</button>`,
  }),
};

export const Remove: Story = {
  render: () => ({
    template: `<button gillesMonorepoBtn variant="remove">✕</button>`,
  }),
};

export const RemoveDisabled: Story = {
  render: () => ({
    template: `<button gillesMonorepoBtn variant="remove" disabled>✕</button>`,
  }),
};

export const AllVariants: Story = {
  render: () => ({
    template: `
      <div class="flex flex-wrap items-center gap-4 p-6">
        <button gillesMonorepoBtn>Primary</button>
        <button gillesMonorepoBtn variant="secondary">Secondary</button>
        <button gillesMonorepoBtn variant="danger">Danger</button>
        <button gillesMonorepoBtn variant="danger-filled">Danger filled</button>
        <button gillesMonorepoBtn variant="ghost" size="sm">Ghost</button>
        <button gillesMonorepoBtn variant="remove">✕</button>
        <button gillesMonorepoBtn variant="remove" disabled>✕</button>
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div class="flex flex-wrap items-end gap-4 p-6">
        <button gillesMonorepoBtn size="sm">Small</button>
        <button gillesMonorepoBtn size="md">Medium</button>
        <button gillesMonorepoBtn size="lg">Large</button>
      </div>
    `,
  }),
};
