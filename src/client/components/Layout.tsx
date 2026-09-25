import { Outlet, Link } from 'react-router-dom';
import { useCurrentProduct } from '@/hooks/useCurrentProduct';
import ProductNav from '@/components/ProductNav';
import ParseErrorsBanner from '@/components/ParseErrorsBanner';
export default function Layout(){
 const {productId,productName}=useCurrentProduct();
 return <div className="min-h-screen bg-[#f7f9f6] text-stone-900"><ParseErrorsBanner/><div className="min-h-screen md:grid md:grid-cols-[220px_minmax(0,1fr)]"><aside className="border-b border-stone-200 bg-[#f0f4f0] p-3 md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r md:p-5"><Link to="/products" className="mb-3 flex items-center gap-2 px-2 text-2xl font-bold tracking-tight md:mb-10"><span className="text-emerald-800">▰</span> forge</Link>{productId&&<ProductNav productId={productId} productName={productName}/>}<nav aria-label="Global" className="mt-3 flex flex-wrap gap-3 border-t border-stone-200 px-3 pt-3 text-xs text-stone-600 md:mt-8 md:flex-col md:gap-4 md:pt-6"><Link to="/products">Products</Link><Link to="/my-work">My Work</Link><Link to="/plans">Plans</Link><Link to="/reviews">Reviews</Link></nav></aside><main className="min-w-0 px-4 py-6 md:p-8 lg:p-10"><Outlet/></main></div></div>;
}
