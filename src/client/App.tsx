import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import ProductListPage from '@/pages/ProductListPage';
import ProductCreatePage from '@/pages/ProductCreatePage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import ProductEditPage from '@/pages/ProductEditPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/products" replace />} />
        <Route path="products" element={<ProductListPage />} />
        <Route path="products/new" element={<ProductCreatePage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="products/:id/edit" element={<ProductEditPage />} />
      </Route>
    </Routes>
  );
}
