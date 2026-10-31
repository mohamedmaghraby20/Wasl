import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { Archive, Check, Pencil, Trash2, X } from 'lucide-react';

const meta = {
  component: Button,
  title: 'UI/Button',
  args: { children: 'Join community' },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const IconActions: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Button aria-label="Edit" size="icon-sm" title="Edit" variant="outline"><Pencil aria-hidden="true" /></Button>
      <Button aria-label="Approve" intent="success" size="icon-sm" title="Approve" variant="outline"><Check aria-hidden="true" /></Button>
      <Button aria-label="Reject" intent="danger" size="icon-sm" title="Reject" variant="outline"><X aria-hidden="true" /></Button>
      <Button aria-label="Archive" intent="warning" size="icon-sm" title="Archive" variant="outline"><Archive aria-hidden="true" /></Button>
      <Button aria-label="Delete" intent="danger" size="icon-sm" title="Delete" variant="ghost"><Trash2 aria-hidden="true" /></Button>
    </div>
  ),
};
