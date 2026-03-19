import { Outlet, Link } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Link to="/" className="font-bold text-lg">Forge</Link>
          <nav className="ml-6 flex gap-4">
            <Link to="/products" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Products
            </Link>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
