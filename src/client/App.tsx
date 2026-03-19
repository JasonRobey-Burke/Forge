import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import ProductListPage from '@/pages/ProductListPage';
import ProductCreatePage from '@/pages/ProductCreatePage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import ProductEditPage from '@/pages/ProductEditPage';
import IntentionListPage from '@/pages/IntentionListPage';
import IntentionCreatePage from '@/pages/IntentionCreatePage';
import IntentionDetailPage from '@/pages/IntentionDetailPage';
import IntentionEditPage from '@/pages/IntentionEditPage';
import ExpectationListPage from '@/pages/ExpectationListPage';
import ExpectationCreatePage from '@/pages/ExpectationCreatePage';
import ExpectationDetailPage from '@/pages/ExpectationDetailPage';
import ExpectationEditPage from '@/pages/ExpectationEditPage';
import SpecListPage from '@/pages/SpecListPage';
import SpecCreatePage from '@/pages/SpecCreatePage';
import SpecDetailPage from '@/pages/SpecDetailPage';
import SpecEditPage from '@/pages/SpecEditPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/products" replace />} />
        <Route path="products" element={<ProductListPage />} />
        <Route path="products/new" element={<ProductCreatePage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="products/:id/edit" element={<ProductEditPage />} />
        <Route path="products/:productId/intentions" element={<IntentionListPage />} />
        <Route path="products/:productId/intentions/new" element={<IntentionCreatePage />} />
        <Route path="intentions/:id" element={<IntentionDetailPage />} />
        <Route path="intentions/:id/edit" element={<IntentionEditPage />} />
        <Route path="intentions/:intentionId/expectations" element={<ExpectationListPage />} />
        <Route path="intentions/:intentionId/expectations/new" element={<ExpectationCreatePage />} />
        <Route path="expectations/:id" element={<ExpectationDetailPage />} />
        <Route path="expectations/:id/edit" element={<ExpectationEditPage />} />
        <Route path="products/:productId/specs" element={<SpecListPage />} />
        <Route path="products/:productId/specs/new" element={<SpecCreatePage />} />
        <Route path="specs/:id" element={<SpecDetailPage />} />
        <Route path="specs/:id/edit" element={<SpecEditPage />} />
      </Route>
    </Routes>
  );
}
