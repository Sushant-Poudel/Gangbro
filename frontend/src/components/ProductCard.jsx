import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

export default function ProductCard({ product }) {
  const lowestPrice = product.variations?.length > 0
    ? Math.min(...product.variations.map(v => v.price))
    : 0;
  
  const hasDiscount = product.variations?.some(v => v.original_price && v.original_price > v.price);

  return (
    <Link 
      to={`/product/${product.id}`}
      className="product-card group relative bg-card border border-white/10 rounded-lg overflow-hidden hover:border-gold-500/50 transition-all duration-300"
      data-testid={`product-card-${product.id}`}
    >
      {/* Image Container - Square */}
      <div className="aspect-square relative overflow-hidden bg-black">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        
        {/* Sold Out Overlay */}
        {product.is_sold_out && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <Badge variant="destructive" className="text-sm font-heading uppercase tracking-wider">
              Sold Out
            </Badge>
          </div>
        )}

        {/* Discount Badge */}
        {hasDiscount && !product.is_sold_out && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-green-600 text-white text-xs font-semibold">
              SALE
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-heading text-lg font-semibold text-white truncate group-hover:text-gold-500 transition-colors">
          {product.name}
        </h3>
        
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-gold-500 font-bold text-lg">
            Rs {lowestPrice.toLocaleString()}
          </span>
          {product.variations?.length > 1 && (
            <span className="text-white/40 text-sm">onwards</span>
          )}
        </div>
      </div>
    </Link>
  );
}
