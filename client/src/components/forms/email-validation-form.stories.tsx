import type { Meta, StoryObj } from '@storybook/react-vite';
import { EmailValidationForm } from './EmailValidationForm';

const meta = {
  component: EmailValidationForm,
  title: 'Forms/Email validation example',
} satisfies Meta<typeof EmailValidationForm>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
