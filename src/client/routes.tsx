import ProductMapPage from '@/pages/ProductMapPage';
import ProductEvidencePage from '@/pages/ProductEvidencePage';
import { Navigate, type RouteObject } from 'react-router-dom';
import App from './App';
import Layout from '@/components/Layout';
import ProductListPage from '@/pages/ProductListPage';
import ProductWorkspacePage from '@/pages/ProductWorkspacePage';
import ProductSettingsPage from '@/pages/ProductSettingsPage';
import ProductRoadmapPage from '@/pages/ProductRoadmapPage';
import IntentionListPage from '@/pages/IntentionListPage';
import IntentionDetailPage from '@/pages/IntentionDetailPage';
import ExpectationListPage from '@/pages/ExpectationListPage';
import ExpectationDetailPage from '@/pages/ExpectationDetailPage';
import SpecListPage from '@/pages/SpecListPage';
import SpecDetailPage from '@/pages/SpecDetailPage';
import SpecEditPage from '@/pages/SpecEditPage';
import FlowBoardPage from '@/pages/FlowBoardPage';
import MyWorkPage from '@/pages/MyWorkPage';
import PlansListPage from '@/pages/PlansListPage';
import PlanDetailPage from '@/pages/PlanDetailPage';
import ReviewsListPage from '@/pages/ReviewsListPage';
import ReviewDetailPage from '@/pages/ReviewDetailPage';
import MetricsPage from '@/pages/MetricsPage';

export const routes:RouteObject[]=[{element:<App />,children:[{element:<Layout />,children:[
      {index:true, element:<Navigate to="/products" replace />},
      {path:'products', element:<ProductListPage />},
      {path:'products/:id', element:<ProductWorkspacePage />},
      {path:'products/:id/map', element:<ProductMapPage />},
      {path:'products/:id/evidence', element:<ProductEvidencePage />},
      {path:'products/:id/roadmap', element:<ProductRoadmapPage />},
      {path:'products/:id/edit', element:<ProductSettingsPage />},
      {path:'products/:productId/intentions', element:<IntentionListPage />},
      {path:'intentions/:id', element:<IntentionDetailPage />},
      {path:'intentions/:intentionId/expectations', element:<ExpectationListPage />},
      {path:'expectations/:id', element:<ExpectationDetailPage />},
      {path:'products/:productId/specs', element:<SpecListPage />},
      {path:'specs/:id', element:<SpecDetailPage />},
      {path:'specs/:id/edit', element:<SpecEditPage />},
      {path:'products/:productId/board', element:<FlowBoardPage />},
      {path:'my-work', element:<MyWorkPage />},
      {path:'plans', element:<PlansListPage />},
      {path:'plans/:name', element:<PlanDetailPage />},
      {path:'reviews', element:<ReviewsListPage />},
      {path:'reviews/:name', element:<ReviewDetailPage />},
      {path:'products/:productId/metrics', element:<MetricsPage />},
]}]}];
