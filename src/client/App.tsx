import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useFileWatcher } from '@/hooks/useFileWatcher';
import Layout from '@/components/Layout';
import ProductListPage from '@/pages/ProductListPage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import IntentionListPage from '@/pages/IntentionListPage';
import IntentionDetailPage from '@/pages/IntentionDetailPage';
import ExpectationListPage from '@/pages/ExpectationListPage';
import ExpectationDetailPage from '@/pages/ExpectationDetailPage';
import SpecListPage from '@/pages/SpecListPage';
import SpecDetailPage from '@/pages/SpecDetailPage';
import SpecEditPage from '@/pages/SpecEditPage';
import FlowBoardPage from '@/pages/FlowBoardPage';

function RedirectToDetail() {
  const location = useLocation();
  return <Navigate to={location.pathname.replace('/edit', '')} replace />;
}

export default function App() {
  useFileWatcher();

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/products" replace />} />
        <Route path="products" element={<ProductListPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="products/:id/edit" element={<RedirectToDetail />} />
        <Route path="products/:productId/intentions" element={<IntentionListPage />} />
        <Route path="intentions/:id" element={<IntentionDetailPage />} />
        <Route path="intentions/:id/edit" element={<RedirectToDetail />} />
        <Route path="intentions/:intentionId/expectations" element={<ExpectationListPage />} />
        <Route path="expectations/:id" element={<ExpectationDetailPage />} />
        <Route path="expectations/:id/edit" element={<RedirectToDetail />} />
        <Route path="products/:productId/specs" element={<SpecListPage />} />
        <Route path="specs/:id" element={<SpecDetailPage />} />
        <Route path="specs/:id/edit" element={<SpecEditPage />} />
        <Route path="products/:productId/board" element={<FlowBoardPage />} />
      </Route>
    </Routes>
  );
}
