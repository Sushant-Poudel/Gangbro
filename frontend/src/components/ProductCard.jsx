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
      className="product-card group relative bg-card rounded-lg overflow-hidden border border-white/20 transition-all duration-300 hover:scale-[1.02] hover:border-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
      data-testid={`product-card-${product.id}`}
    >
      <div className="aspect-square relative overflow-hidden bg-black">
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

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <div className="p-2 lg:p-3">
        <h3 className="font-heading text-sm lg:text-base font-semibold text-white truncate group-hover:text-gold-500 transition-colors">{product.name}</h3>
        <div className="mt-1 flex items-baseline gap-1 lg:gap-2">
          <span className="text-gold-500 font-bold text-sm lg:text-base">Rs {lowestPrice.toLocaleString()}</span>
          {product.variations?.length > 1 && <span className="text-white/40 text-[10px] lg:text-xs">onwards</span>}
        </div>
      </div>
    </Link>
  );
}
