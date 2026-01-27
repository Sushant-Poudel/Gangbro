import { useEffect, useState } from 'react';
import { Package, FolderOpen, Star, FileText, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { productsAPI, categoriesAPI, reviewsAPI, socialLinksAPI } from '@/lib/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    products: 0,
    categories: 0,
    reviews: 0,
    socialLinks: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [productsRes, categoriesRes, reviewsRes, linksRes] = await Promise.all([
          productsAPI.getAll(null, false),
          categoriesAPI.getAll(),
          reviewsAPI.getAll(),
          socialLinksAPI.getAll()
        ]);
        
        setStats({
          products: productsRes.data.length,
          categories: categoriesRes.data.length,
          reviews: reviewsRes.data.length,
          socialLinks: linksRes.data.length
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { label: 'Categories', value: stats.categories, icon: FolderOpen, color: 'bg-purple-500/10 text-purple-500', link: '/admin/categories' },
    { label: 'Products', value: stats.products, icon: Package, color: 'bg-blue-500/10 text-blue-500', link: '/admin/products' },
    { label: 'Reviews', value: stats.reviews, icon: Star, color: 'bg-gold-500/10 text-gold-500', link: '/admin/reviews' },
    { label: 'Social Links', value: stats.socialLinks, icon: Share2, color: 'bg-green-500/10 text-green-500', link: '/admin/social-links' },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6" data-testid="admin-dashboard">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.label}
                to={stat.link}
                className="bg-card border border-white/10 rounded-lg p-4 lg:p-6 hover:border-gold-500/30 transition-all"
                data-testid={`stat-card-${stat.label.toLowerCase()}`}
              >
                <div className="flex items-center justify-between mb-3 lg:mb-4">
                  <div className={`p-2 lg:p-3 rounded-lg ${stat.color}`}>
                    <Icon className="h-4 w-4 lg:h-6 lg:w-6" />
                  </div>
                </div>
                <h3 className="text-white/60 text-xs lg:text-sm mb-1">{stat.label}</h3>
                <p className="font-heading text-2xl lg:text-3xl font-bold text-white">
                  {isLoading ? '-' : stat.value}
                </p>
              </Link>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-card border border-white/10 rounded-lg p-4 lg:p-6">
          <h2 className="font-heading text-lg lg:text-xl font-semibold text-white uppercase mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
            <Link
              to="/admin/categories"
              className="flex items-center gap-3 p-3 lg:p-4 bg-black rounded-lg border border-white/10 hover:border-gold-500/50 transition-all"
              data-testid="quick-action-categories"
            >
              <FolderOpen className="h-5 w-5 text-gold-500 flex-shrink-0" />
              <span className="text-white text-sm lg:text-base">Manage Categories</span>
            </Link>
            <Link
              to="/admin/products"
              className="flex items-center gap-3 p-3 lg:p-4 bg-black rounded-lg border border-white/10 hover:border-gold-500/50 transition-all"
              data-testid="quick-action-products"
            >
              <Package className="h-5 w-5 text-gold-500 flex-shrink-0" />
              <span className="text-white text-sm lg:text-base">Manage Products</span>
            </Link>
            <Link
              to="/admin/reviews"
              className="flex items-center gap-3 p-3 lg:p-4 bg-black rounded-lg border border-white/10 hover:border-gold-500/50 transition-all"
              data-testid="quick-action-reviews"
            >
              <Star className="h-5 w-5 text-gold-500 flex-shrink-0" />
              <span className="text-white text-sm lg:text-base">Manage Reviews</span>
            </Link>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="bg-gradient-to-r from-gold-500/10 to-transparent border border-gold-500/20 rounded-lg p-4 lg:p-6">
          <h2 className="font-heading text-lg lg:text-xl font-semibold text-white mb-2">
            Welcome to GameShop Nepal Admin
          </h2>
          <p className="text-white/60 text-sm lg:text-base">
            Manage your products, reviews, pages, and social media links from this dashboard.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
