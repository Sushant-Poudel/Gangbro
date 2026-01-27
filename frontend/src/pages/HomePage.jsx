import { useEffect, useState } from 'react';
import { Star, ExternalLink, Shield, Clock, Headphones } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import ReviewCard from '@/components/ReviewCard';
import { Button } from '@/components/ui/button';
import { productsAPI, reviewsAPI, categoriesAPI, seedAPI } from '@/lib/api';

const TRUSTPILOT_URL = "https://www.trustpilot.com/review/gameshopnepal.com";

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // First seed data if needed
        await seedAPI.seed().catch(() => {});
        
        const [productsRes, reviewsRes, categoriesRes] = await Promise.all([
          productsAPI.getAll(null, true),
          reviewsAPI.getAll(),
          categoriesAPI.getAll()
        ]);
        
        setProducts(productsRes.data);
        setReviews(reviewsRes.data);
        setCategories(categoriesRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products;

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      {/* Hero Section with Reviews */}
      <section className="pt-20" data-testid="reviews-section">
        {/* Trustpilot Strip */}
        <div className="trustpilot-section py-4 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 text-gold-500 fill-gold-500" />
                  ))}
                </div>
                <span className="text-white font-heading font-semibold uppercase tracking-wider">
                  Excellent on Trustpilot
                </span>
              </div>
              <a
                href={TRUSTPILOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="check-all-reviews-btn"
              >
                <Button variant="outline" className="border-gold-500 text-gold-500 hover:bg-gold-500 hover:text-black font-heading uppercase tracking-wider">
                  Check All Reviews
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="py-12 bg-gradient-to-b from-black to-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-white uppercase tracking-tight mb-8 text-center">
              What Our Customers Say
            </h2>
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-40 skeleton rounded-lg"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reviews.slice(0, 6).map((review, index) => (
                  <div key={review.id} className="animate-fadeIn" style={{ animationDelay: `${index * 100}ms` }}>
                    <ReviewCard review={review} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 border-y border-white/10" data-testid="trust-badges">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center gap-4 justify-center md:justify-start">
              <div className="p-3 rounded-lg bg-gold-500/10">
                <Clock className="h-6 w-6 text-gold-500" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-white uppercase">Instant Delivery</h3>
                <p className="text-white/60 text-sm">Products delivered in minutes</p>
              </div>
            </div>
            <div className="flex items-center gap-4 justify-center">
              <div className="p-3 rounded-lg bg-gold-500/10">
                <Shield className="h-6 w-6 text-gold-500" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-white uppercase">100% Safe</h3>
                <p className="text-white/60 text-sm">Secure transactions guaranteed</p>
              </div>
            </div>
            <div className="flex items-center gap-4 justify-center md:justify-end">
              <div className="p-3 rounded-lg bg-gold-500/10">
                <Headphones className="h-6 w-6 text-gold-500" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-white uppercase">24/7 Support</h3>
                <p className="text-white/60 text-sm">Always here to help</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-16" data-testid="products-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-white uppercase tracking-tight mb-4">
              Our <span className="text-gold-500">Products</span>
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Browse our collection of premium digital products - gaming subscriptions, OTT services, software licenses, and more.
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            <button
              onClick={() => setSelectedCategory(null)}
              data-testid="category-all"
              className={`category-pill px-4 py-2 rounded-full border text-sm font-heading uppercase tracking-wider transition-all ${
                selectedCategory === null
                  ? 'bg-gold-500/20 border-gold-500 text-gold-500'
                  : 'border-white/20 text-white/60 hover:border-gold-500/50 hover:text-gold-500'
              }`}
            >
              All Products
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                data-testid={`category-${cat.slug}`}
                className={`category-pill px-4 py-2 rounded-full border text-sm font-heading uppercase tracking-wider transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-gold-500/20 border-gold-500 text-gold-500'
                    : 'border-white/20 text-white/60 hover:border-gold-500/50 hover:text-gold-500'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <div key={i} className="aspect-square skeleton rounded-lg"></div>
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredProducts.map((product, index) => (
                <div key={product.id} className="animate-fadeIn" style={{ animationDelay: `${index * 50}ms` }}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-white/40 text-lg">No products found in this category.</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
