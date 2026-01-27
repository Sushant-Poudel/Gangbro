import { useEffect, useState } from 'react';
import { Package, Star, FileText, Share2 } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { productsAPI, reviewsAPI, socialLinksAPI } from '@/lib/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    products: 0,
    reviews: 0,
    socialLinks: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [productsRes, reviewsRes, linksRes] = await Promise.all([
          productsAPI.getAll(null, false),
          reviewsAPI.getAll(),
          socialLinksAPI.getAll()
        ]);
        
        setStats({
          products: productsRes.data.length,
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
    { label: 'Total Products', value: stats.products, icon: Package, color: 'bg-blue-500/10 text-blue-500' },
    { label: 'Customer Reviews', value: stats.reviews, icon: Star, color: 'bg-gold-500/10 text-gold-500' },
    { label: 'Social Links', value: stats.socialLinks, icon: Share2, color: 'bg-green-500/10 text-green-500' },
    { label: 'Pages', value: 3, icon: FileText, color: 'bg-purple-500/10 text-purple-500' },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-8" data-testid="admin-dashboard">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-card border border-white/10 rounded-lg p-6 hover:border-gold-500/30 transition-all"
                data-testid={`stat-card-${stat.label.toLowerCase().replace(' ', '-')}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <h3 className="text-white/60 text-sm mb-1">{stat.label}</h3>
                <p className="font-heading text-3xl font-bold text-white">
                  {isLoading ? '-' : stat.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-card border border-white/10 rounded-lg p-6">
          <h2 className="font-heading text-xl font-semibold text-white uppercase mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/admin/products"
              className="flex items-center gap-3 p-4 bg-black rounded-lg border border-white/10 hover:border-gold-500/50 transition-all"
              data-testid="quick-action-products"
            >
              <Package className="h-5 w-5 text-gold-500" />
              <span className="text-white">Manage Products</span>
            </a>
            <a
              href="/admin/reviews"
              className="flex items-center gap-3 p-4 bg-black rounded-lg border border-white/10 hover:border-gold-500/50 transition-all"
              data-testid="quick-action-reviews"
            >
              <Star className="h-5 w-5 text-gold-500" />
              <span className="text-white">Manage Reviews</span>
            </a>
            <a
              href="/admin/pages"
              className="flex items-center gap-3 p-4 bg-black rounded-lg border border-white/10 hover:border-gold-500/50 transition-all"
              data-testid="quick-action-pages"
            >
              <FileText className="h-5 w-5 text-gold-500" />
              <span className="text-white">Edit Pages</span>
            </a>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="bg-gradient-to-r from-gold-500/10 to-transparent border border-gold-500/20 rounded-lg p-6">
          <h2 className="font-heading text-xl font-semibold text-white mb-2">
            Welcome to GameShop Nepal Admin
          </h2>
          <p className="text-white/60">
            Manage your products, reviews, pages, and social media links from this dashboard.
            Use the navigation on the left to access different sections.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
