import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_8ec93a6a-4f80-4dde-b760-4bc71482fa44/artifacts/4uqt5osn_Staff.zip%20-%201.png";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/terms', label: 'TOS' },
  ];

  const isActive = (path) => location.pathname === path;

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
      setIsMenuOpen(false);
      // Scroll to products section after a short delay
      setTimeout(() => {
        const productsSection = document.querySelector('[data-testid="products-section"]');
        if (productsSection) {
          productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 navbar-blur bg-black/80 border-b border-white/10" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center" data-testid="nav-logo">
            <img 
              src={LOGO_URL} 
              alt="GameShop Nepal" 
              className="h-10 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                data-testid={`nav-link-${link.label.toLowerCase()}`}
                className={`font-heading text-sm uppercase tracking-wider transition-colors ${
                  isActive(link.href)
                    ? 'text-gold-500'
                    : 'text-white/80 hover:text-gold-500'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Search Button - Desktop */}
          <div className="hidden md:flex items-center">
            {isSearchOpen ? (
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-gold-500 w-48"
                  autoFocus
                  data-testid="search-input"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSearchOpen(false)}
                  className="text-white/60 hover:text-white p-1"
                >
                  <X className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSearchOpen(true)}
                className="text-white/60 hover:text-gold-500"
                data-testid="search-btn"
              >
                <Search className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="text-white/60 hover:text-gold-500 p-2"
              data-testid="mobile-search-btn"
            >
              <Search className="h-5 w-5" />
            </Button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-white"
              data-testid="mobile-menu-toggle"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        {isSearchOpen && (
          <div className="md:hidden py-3 border-t border-white/10">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-base text-white placeholder:text-white/40 focus:outline-none focus:border-gold-500"
                autoFocus
                data-testid="mobile-search-input"
              />
              <Button
                type="submit"
                size="sm"
                className="bg-gold-500 hover:bg-gold-600 text-black"
              >
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>
        )}

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10" data-testid="mobile-menu">
            <div className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  data-testid={`mobile-nav-link-${link.label.toLowerCase()}`}
                  onClick={() => setIsMenuOpen(false)}
                  className={`font-heading text-sm uppercase tracking-wider py-2 ${
                    isActive(link.href)
                      ? 'text-gold-500'
                      : 'text-white/80'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
