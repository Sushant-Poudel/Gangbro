import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, FolderOpen, Star, FileText, Share2, LogOut, Home, Menu, X, HelpCircle, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_8ec93a6a-4f80-4dde-b760-4bc71482fa44/artifacts/4uqt5osn_Staff.zip%20-%201.png";

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/categories', label: 'Categories', icon: FolderOpen },
  { path: '/admin/products', label: 'Products', icon: Package },
  { path: '/admin/reviews', label: 'Reviews', icon: Star },
  { path: '/admin/faqs', label: 'FAQs', icon: HelpCircle },
  { path: '/admin/pages', label: 'Pages', icon: FileText },
  { path: '/admin/social-links', label: 'Social Links', icon: Share2 },
  { path: '/admin/takeapp', label: 'Take.app', icon: Store },
];

export default function AdminLayout({ children, title }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-screen bg-black">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-black border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <Link to="/">
          <img src={LOGO_URL} alt="GameShop Nepal" className="h-8" />
        </Link>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-white hover:text-gold-500"
          data-testid="admin-mobile-menu-btn"
        >
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/80 z-40"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`admin-sidebar fixed left-0 top-0 bottom-0 w-64 flex flex-col z-50 transform transition-transform duration-300 lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        data-testid="admin-sidebar"
      >
        {/* Logo - Hidden on mobile (shown in header) */}
        <div className="hidden lg:block p-6 border-b border-white/10">
          <Link to="/">
            <img src={LOGO_URL} alt="GameShop Nepal" className="h-10" />
          </Link>
        </div>

        {/* Mobile close area */}
        <div className="lg:hidden p-4 border-b border-white/10 flex items-center justify-between">
          <span className="font-heading text-white uppercase tracking-wider">Menu</span>
          <button onClick={closeSidebar} className="p-1 text-white/60 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 lg:py-6 overflow-y-auto">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={closeSidebar}
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
          <Link to="/" onClick={closeSidebar}>
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
      <main className="lg:ml-64 pt-14 lg:pt-0">
        {/* Header */}
        <header className="bg-card/50 border-b border-white/10 px-4 lg:px-8 py-4 lg:py-6">
          <h1 className="font-heading text-xl lg:text-2xl font-bold text-white uppercase tracking-wider">
            {title}
          </h1>
        </header>

        {/* Content */}
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
