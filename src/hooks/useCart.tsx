import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productExistsInCart = cart.find(product => product.id === productId);

      if (!productExistsInCart) {

        const { data: product } = await api.get<Product>(`/products/${productId}`)
        const { data: stock } = await api.get<Stock>(`/stock/${productId}`)
        if (stock.amount > 0) {
          setCart([...cart, { ...product, amount: 1 }])
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, { ...product, amount: 1 }]))
          toast.success('Adicionado')
        }

      } else {
        const { data: stock } = await api.get<Stock>(`/stock/${productId}`)

        if (stock.amount < productExistsInCart.amount + 1) {
          toast.error('Quantidade solicitada fora de estoque')
          return
        }

        const updateProductAmount = cart.map(product => product.id === productId ? {
          ...product, amount: Number(product.amount) + 1
        } : product)

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateProductAmount))
        setCart(updateProductAmount)
      }

    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const removeProductFromCart = cart.filter(product => product.id !== productId);

      const productIndex = cart.findIndex(product => product.id === productId)

      if (productIndex >= 0) {
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(removeProductFromCart))
        setCart(removeProductFromCart)
      } else {
        throw new Error();
      }

    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const stockResponse = await api.get<Stock>(`stock/${productId}`);

      if (amount <= stockResponse.data.amount) {
        const updateProductAmount = cart.map(product => product.id === productId ? {
          ...product, amount
        } : { ...product })

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateProductAmount))
        setCart(updateProductAmount)
      } else {
        const { data: stock } = await api.get<Stock>(`/stock/${productId}`)

        if (stock.amount < amount + 1) {
          toast.error('Quantidade solicitada fora de estoque')
          return
        }
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
