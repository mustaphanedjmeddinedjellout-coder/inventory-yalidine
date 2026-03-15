import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Analytics from './pages/Analytics';
import StorefrontLayout from './storefront/StorefrontLayout';
import Home from './storefront/pages/Home';
import Product from './storefront/pages/Product';
import Cart from './storefront/pages/Cart';
import Checkout from './storefront/pages/Checkout';
import OrderSuccess from './storefront/pages/OrderSuccess';
import { CartProvider } from './storefront/cart-context';

function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <Routes>
          <Route element={<StorefrontLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/product/:slug" element={<Product />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-success/:id" element={<OrderSuccess />} />
          </Route>

          <Route path="/admin" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="orders" element={<Orders />} />
            <Route path="analytics" element={<Analytics />} />
          </Route>
        </Routes>
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;
