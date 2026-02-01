import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

export default function ProductCard({ product }) {
  const lowestPrice = product.variations?.length > 0
    ? Math.min(...product.variations.map(v => v.price))
    : 0;

  const tags = product.tags || [];
  
  // Use slug if available, otherwise fall back to ID
  const productUrl = product.slug ? `/product/${product.slug}` : `/product/${product.id}`;

  return (
    <Link
      to={productUrl}
      className="product-card group block rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1"
      data-testid={`product-card-${product.id}`}
      style={{
        border: '2px solid rgba(255, 255, 255, 0.15)',
        background: 'linear-gradient(145deg, rgba(30,30,30,1) 0%, rgba(15,15,15,1) 100%)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.border = '2px solid #22c55e';
        e.currentTarget.style.boxShadow = '0 0 30px rgba(34, 197, 94, 0.6), 0 0 60px rgba(34, 197, 94, 0.3), 0 8px 32px rgba(0,0,0,0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.border = '2px solid rgba(255, 255, 255, 0.15)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
      }}
    >
      <div className="aspect-square relative overflow-hidden bg-black/50">
        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />

        {product.is_sold_out && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <Badge variant="destructive" className="text-xs lg:text-sm font-heading uppercase tracking-wider">Sold Out</Badge>
          </div>
        )}

        {!product.is_sold_out && tags.length > 0 && (
          <div className="absolute top-1.5 right-1.5 lg:top-2 lg:right-2 flex flex-col gap-1">
            {tags.map(tag => (
              <Badge key={tag} className="bg-gold-500 text-black text-[10px] lg:text-xs font-semibold px-1.5 lg:px-2">{tag.toUpperCase()}</Badge>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 lg:p-4 border-t border-white/10">
        <h3 className="font-heading text-sm lg:text-base font-semibold text-white truncate group-hover:text-green-400 transition-colors">{product.name}</h3>
        <div className="mt-1.5 flex items-baseline gap-1 lg:gap-2">
          <span className="text-green-400 font-bold text-base lg:text-lg">Rs {lowestPrice.toLocaleString()}</span>
          {product.variations?.length > 1 && <span className="text-white/40 text-[10px] lg:text-xs">onwards</span>}
        </div>
      </div>
    </Link>
  );
}
