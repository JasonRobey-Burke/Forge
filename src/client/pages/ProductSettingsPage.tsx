import { useParams } from 'react-router-dom';
import { useProduct } from '@/hooks/useProducts';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import ArtifactDocumentPage from './ArtifactDocumentPage';
export default function ProductSettingsPage(){const {id=''}=useParams(),query=useProduct(id);useDocumentTitle(`${query.data?.name??'Product'} — Product settings`);return <ArtifactDocumentPage key={id} type="products" settings record={query.data} loading={query.isLoading} error={query.error} refetch={query.refetch}/>;}
