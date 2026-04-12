import type { Meta, StoryObj } from '@storybook/angular';
import { LoaderComponent } from './loader.component';

const meta: Meta<LoaderComponent> = {
  title: 'Recipe/Loader',
  component: LoaderComponent,
};

export default meta;
type Story = StoryObj<LoaderComponent>;

export const Default: Story = {};
