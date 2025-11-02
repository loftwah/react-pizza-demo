import { describe, expect, it, beforeEach } from 'vitest';
import { renderWithProviders, screen, userEvent } from '../../test/test-utils';
import { LineItemCustomiser } from '../LineItemCustomiser';
import { useCartStore } from '../../stores/cart';
import { getPizzaById } from '../../domain/menu';
import { sizeLabels } from '../../domain/pizza';
import type { OrderLineItem } from '../../stores/orders';

const basePizza = getPizzaById('pepperoni-classic');
if (!basePizza) {
  throw new Error(
    'Expected pepperoni-classic pizza definition for LineItemCustomiser tests.',
  );
}

const initialCartState = useCartStore.getState();
const resetCartStore = () => {
  useCartStore.setState(
    {
      ...initialCartState,
      items: [],
    },
    true,
  );
};

const createLineItem = (
  overrides?: Partial<OrderLineItem>,
): OrderLineItem => ({
  id: 'pepperoni-classic-medium',
  cartLineUid: 'line-test-123',
  pizzaId: basePizza.id,
  size: 'medium' as const,
  name: basePizza.displayName,
  sizeLabel: sizeLabels.medium,
  quantity: 1,
  unitPrice: basePizza.prices.medium,
  lineTotal: basePizza.prices.medium,
  customization: {
    removedIngredients: [],
    addedIngredients: [],
  },
  ...overrides,
});

describe('LineItemCustomiser', () => {
  beforeEach(() => {
    resetCartStore();
  });

  it('keeps extras panel open across re-renders for the same cart line', async () => {
    const user = userEvent.setup();
    const item = createLineItem();

    const { rerender } = renderWithProviders(
      <LineItemCustomiser item={item} />,
    );

    await user.click(screen.getByRole('button', { name: /edit extras/i }));
    expect(
      screen.getByRole('button', { name: /hide extras/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/reset extras/i)).toBeInTheDocument();

    const updatedItem = createLineItem({ quantity: 2 });
    rerender(<LineItemCustomiser item={updatedItem} />);

    expect(
      screen.getByRole('button', { name: /hide extras/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/reset extras/i)).toBeInTheDocument();
  });

  it('tracks open state independently per cart line uid', async () => {
    const user = userEvent.setup();
    const firstItem = createLineItem({ cartLineUid: 'line-first' });
    const secondItem = createLineItem({ cartLineUid: 'line-second' });

    renderWithProviders(
      <>
        <LineItemCustomiser item={firstItem} />
        <LineItemCustomiser item={secondItem} />
      </>,
    );

    const firstToggle = screen.getAllByRole('button', { name: /edit extras/i })[0];
    const secondToggle = screen.getAllByRole('button', { name: /edit extras/i })[1];

    await user.click(firstToggle);

    expect(
      screen.getAllByRole('button', { name: /hide extras/i })[0],
    ).toBeInTheDocument();
    expect(secondToggle).toBeInTheDocument();
    expect(secondToggle).toHaveAttribute('aria-expanded', 'false');
  });
});
