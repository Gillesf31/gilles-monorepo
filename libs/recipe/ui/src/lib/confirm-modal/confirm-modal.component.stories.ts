import type { Meta, StoryObj } from '@storybook/angular';
import { ConfirmModalComponent } from './confirm-modal.component';

const meta: Meta<ConfirmModalComponent> = {
  title: 'Recipe/ConfirmModal',
  component: ConfirmModalComponent,
};

export default meta;
type Story = StoryObj<ConfirmModalComponent>;

export const Default: Story = {
  args: {
    title: 'Supprimer la recette',
    message:
      'Voulez-vous vraiment supprimer «\u00a0Pasta Carbonara\u00a0» ? Cette action est irréversible.',
    confirmLabel: 'Supprimer',
    cancelLabel: 'Annuler',
  },
};

export const CustomLabels: Story = {
  args: {
    title: 'Quitter sans enregistrer',
    message:
      'Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter ?',
    confirmLabel: 'Quitter',
    cancelLabel: 'Rester',
  },
};

export const DestructiveShortMessage: Story = {
  args: {
    title: 'Vider la collection',
    message: 'Cette action supprimera toutes vos recettes.',
    confirmLabel: 'Tout supprimer',
    cancelLabel: 'Annuler',
  },
};
