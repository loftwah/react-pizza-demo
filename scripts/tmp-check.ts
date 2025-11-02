import { useCartStore } from '../src/stores/cart';

useCartStore.getState().clear();
useCartStore.getState().addItem('pepperoni-classic', 'medium');
console.log('initial', JSON.stringify(useCartStore.getState().items, null, 2));
const itemId = useCartStore.getState().items[0]?.id;
if (!itemId) throw new Error('No item');
useCartStore.getState().updateCustomization(itemId, {
  removedIngredients: [],
  addedIngredients: [{ id: 'extra-mozzarella', quantity: 2 }],
});
console.log('after update', JSON.stringify(useCartStore.getState().items, null, 2));
