import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Star, ExternalLink, Search, X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import ReviewCard from '@/components/ReviewCard';
import { Button } from '@/components/ui/button';
import { productsAPI, reviewsAPI, categoriesAPI } from '@/lib/api';

const TRUSTPILOT_URL = "https://www.trustpilot.com/review/gameshopnepal.com";

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const productsSectionRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
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

  // Scroll to products section when search query changes
  useEffect(() => {
    if (searchQuery && productsSectionRef.current) {
      productsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [searchQuery]);

  const clearSearch = () => {
    setSearchParams({});
  };

  // Filter by category and search query
  const filteredProducts = products.filter(p => {
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      {/* Hero Section with Reviews */}
      <section className="pt-16 lg:pt-20" data-testid="reviews-section">
        {/* Trustpilot Strip */}
        <div className="trustpilot-section py-3 lg:py-4 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 lg:gap-4">
              <div className="flex items-center gap-2 lg:gap-4">
                <div className="flex items-center gap-0.5 lg:gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-4 w-4 lg:h-5 lg:w-5 text-gold-500 fill-gold-500" />
                  ))}
                </div>
                <span className="text-white font-heading font-semibold uppercase tracking-wider text-sm lg:text-base">
                  Excellent on Trustpilot
                </span>
              </div>
              <a
                href={TRUSTPILOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="check-all-reviews-btn"
                className="w-full sm:w-auto"
              >
                <Button variant="outline" className="border-gold-500 text-gold-500 hover:bg-gold-500 hover:text-black font-heading uppercase tracking-wider text-xs lg:text-sm w-full sm:w-auto">
                  Check All Reviews
                  <ExternalLink className="ml-2 h-3 w-3 lg:h-4 lg:w-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Reviews Marquee */}
        <div className="py-8 lg:py-12 bg-gradient-to-b from-black to-transparent overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-white uppercase tracking-tight mb-6 lg:mb-8 text-center">
              What Our Customers Say
            </h2>
          </div>
          
          {isLoading ? (
            <div className="flex gap-4 lg:gap-6 px-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 lg:h-40 w-72 lg:w-80 skeleton rounded-lg flex-shrink-0"></div>
              ))}
            </div>
          ) : reviews.length > 0 ? (
            <div className="reviews-marquee-container">
              <div className="reviews-marquee">
                {/* First set of reviews */}
                {reviews.map((review) => (
                  <div key={review.id} className="review-slide">
                    <ReviewCard review={review} />
                  </div>
                ))}
                {/* Duplicate set for seamless loop */}
                {reviews.map((review) => (
                  <div key={`dup-${review.id}`} className="review-slide">
                    <ReviewCard review={review} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-white/40">No reviews yet</div>
          )}
        </div>
      </section>

      {/* Products Section */}
      <section ref={productsSectionRef} className="py-10 lg:py-16" data-testid="products-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-8 lg:mb-12">
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white uppercase tracking-tight mb-3 lg:mb-4">
              Our <span className="text-gold-500">Products</span>
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-sm lg:text-base">
              Browse our collection of premium digital products - gaming subscriptions, OTT services, software licenses, and more.
            </p>
          </div>

          {/* Search Results Indicator */}
          {searchQuery && (
            <div className="flex items-center justify-center gap-2 mb-6 lg:mb-8">
              <div className="flex items-center gap-2 bg-gold-500/10 border border-gold-500/30 rounded-full px-4 py-2">
                <Search className="h-4 w-4 text-gold-500" />
                <span className="text-white text-sm">
                  Results for "<span className="text-gold-500">{searchQuery}</span>"
                </span>
                <button
                  onClick={clearSearch}
                  className="ml-1 p-1 hover:bg-white/10 rounded-full transition-colors"
                  data-testid="clear-search"
                >
                  <X className="h-4 w-4 text-white/60 hover:text-white" />
                </button>
              </div>
            </div>
          )}

          {/* Category Filter */}
          <div className="flex flex-wrap items-center justify-center gap-2 lg:gap-3 mb-8 lg:mb-12">
            <button
              onClick={() => setSelectedCategory(null)}
              data-testid="category-all"
              className={`category-pill px-3 lg:px-4 py-1.5 lg:py-2 rounded-full border text-xs lg:text-sm font-heading uppercase tracking-wider transition-all ${
                selectedCategory === null
                  ? 'bg-gold-500/20 border-gold-500 text-gold-500'
                  : 'border-white/20 text-white/60 hover:border-gold-500/50 hover:text-gold-500'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                data-testid={`category-${cat.slug}`}
                className={`category-pill px-3 lg:px-4 py-1.5 lg:py-2 rounded-full border text-xs lg:text-sm font-heading uppercase tracking-wider transition-all ${
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <div key={i} className="aspect-square skeleton rounded-lg"></div>
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-6">
              {filteredProducts.map((product, index) => (
                <div key={product.id} className="animate-fadeIn" style={{ animationDelay: `${index * 50}ms` }}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-white/40 text-lg">
                {searchQuery 
                  ? `No products found for "${searchQuery}"`
                  : 'No products found in this category.'
                }
              </p>
              {searchQuery && (
                <Button
                  onClick={clearSearch}
                  variant="outline"
                  className="mt-4 border-gold-500 text-gold-500 hover:bg-gold-500 hover:text-black"
                >
                  Clear Search
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
