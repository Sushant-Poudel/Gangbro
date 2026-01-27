import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Star, FileText, Share2, LogOut, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_8ec93a6a-4f80-4dde-b760-4bc71482fa44/artifacts/4uqt5osn_Staff.zip%20-%201.png";

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/products', label: 'Products', icon: Package },
  { path: '/admin/reviews', label: 'Reviews', icon: Star },
  { path: '/admin/pages', label: 'Pages', icon: FileText },
  { path: '/admin/social-links', label: 'Social Links', icon: Share2 },
];

export default function AdminLayout({ children, title }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar */}
      <aside className="admin-sidebar w-64 fixed left-0 top-0 bottom-0 flex flex-col" data-testid="admin-sidebar">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <Link to="/">
            <img src={LOGO_URL} alt="GameShop Nepal" className="h-10" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    data-testid={`admin-nav-${item.label.toLowerCase().replace(' ', '-')}`}
                    className={`admin-nav-item flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'active text-gold-500'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <Link to="/">
            <Button variant="ghost" className="w-full justify-start text-white/60 hover:text-white" data-testid="admin-view-site">
              <Home className="h-4 w-4 mr-2" />
              View Site
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
            data-testid="admin-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {/* Header */}
        <header className="bg-card/50 border-b border-white/10 px-8 py-6">
          <h1 className="font-heading text-2xl font-bold text-white uppercase tracking-wider">
            {title}
          </h1>
        </header>

        {/* Content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
