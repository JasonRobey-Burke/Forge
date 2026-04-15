import { Outlet, Link } from 'react-router-dom';
import { useCurrentProduct } from '@/hooks/useCurrentProduct';
import ProductNav from '@/components/ProductNav';

export default function Layout() {
  const { productId, productName, isProductRoute } = useCurrentProduct();

  return (
    <div className="min-h-screen bg-background">
      <div className="h-[3px] bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500" />
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500">
              <span className="text-sm font-bold leading-none text-white">F</span>
            </div>
            <span className="font-bold text-lg tracking-tight">Forge</span>
          </Link>
          <nav className="ml-6 flex gap-4">
            <Link to="/products" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Products
            </Link>
            <Link to="/my-work" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              My Work
            </Link>
            <Link to="/plans" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Plans
            </Link>
          </nav>
        </div>
      </header>
      {isProductRoute && productId && (
        <ProductNav productId={productId} productName={productName} />
      )}
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
