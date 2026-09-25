import { useMatch } from 'react-router-dom';
import { useProduct } from '@/hooks/useProducts';
import { useIntention } from '@/hooks/useIntentions';
import { useExpectation } from '@/hooks/useExpectations';
import { useSpec } from '@/hooks/useSpecs';
export function useCurrentProduct() {
  const productMatch=useMatch('/products/:id/*');
  const intentionMatch=useMatch('/intentions/:id/*');
  const expectationMatch=useMatch('/expectations/:id/*');
  const specMatch=useMatch('/specs/:id/*');
  const {data:expectation}=useExpectation(expectationMatch?.params.id??'');
  const {data:intention}=useIntention(intentionMatch?.params.id??expectation?.intention_id??'');
  const {data:spec}=useSpec(specMatch?.params.id??'');
  const productId=productMatch?.params.id??intention?.product_id??spec?.product_id??null;
  const {data:product}=useProduct(productId??'');
  return {productId,productName:product?.name??null,isProductRoute:!!productId};
}
