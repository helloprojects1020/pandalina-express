import { useCartStore } from '@/store/cartStore';
import ProductModal from './ProductModal';

/**
 * Bridges the cart editing flow:
 * When editingCartItemId is set, opens ProductModal with that item's MenuItem.
 */
const EditProductModal = () => {
  const editingCartItemId = useCartStore((s) => s.editingCartItemId);
  const items = useCartStore((s) => s.items);
  const setEditingCartItemId = useCartStore((s) => s.setEditingCartItemId);

  const editingItem = editingCartItemId ? items.find((i) => i.id === editingCartItemId) : null;

  return (
    <ProductModal
      item={editingItem?.menuItem ?? null}
      onClose={() => setEditingCartItemId(null)}
    />
  );
};

export default EditProductModal;
