import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const resolveFixturePath = (relativePath: string) =>
  fileURLToPath(new URL(relativePath, import.meta.url));

const cartFixture = JSON.parse(
  readFileSync(resolveFixturePath('../mocks/cart-state.json'), 'utf-8'),
);

const cartStorageKey = 'loftwah-pizza-cart';

test.describe('Checkout extras panel', () => {
  test('stays open after removing a quantity from a line item', async ({
    page,
  }) => {
    await page.addInitScript(
      ({ storageKey, cartState }) => {
        window.localStorage.setItem(storageKey, cartState);
      },
      {
        storageKey: cartStorageKey,
        cartState: JSON.stringify(cartFixture),
      },
    );

    await page.goto('./checkout');

    const editExtrasButton = page.getByRole('button', { name: /edit extras/i });
    await expect(editExtrasButton).toBeVisible();
    await editExtrasButton.click();

    const hideExtrasButton = page.getByRole('button', { name: /hide extras/i });
    await expect(hideExtrasButton).toBeVisible();
    await expect(page.getByText(/reset extras/i)).toBeVisible();

    await page.getByRole('button', { name: /remove one/i }).click();

    await expect(
      page.getByRole('button', { name: /hide extras/i }),
    ).toBeVisible();
    await expect(page.getByText(/reset extras/i)).toBeVisible();
  });
});
