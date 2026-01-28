import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Check } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { productsAPI } from '@/lib/api';

const WHATSAPP_NUMBER = "9779743488871";
const DESCRIPTION_CHAR_LIMIT = 200;

export default function ProductPage() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await productsAPI.getOne(productId);
        setProduct(res.data);
        if (res.data.variations?.length > 0) {
          setSelectedVariation(res.data.variations[0].id);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const currentVariation = product?.variations?.find(v => v.id === selectedVariation);

  const handleOrderNow = () => {
    const message = `Hi! I want to order:\n\n*Product:* ${product.name}\n*Plan:* ${currentVariation?.name}\n*Price:* Rs ${currentVariation?.price?.toLocaleString()}\n\nPlease process my order.`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="pt-16 lg:pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
            <div className="aspect-square skeleton rounded-lg"></div>
            <div className="space-y-4 lg:space-y-6">
              <div className="h-8 lg:h-10 w-3/4 skeleton rounded"></div>
              <div className="h-6 w-1/4 skeleton rounded"></div>
              <div className="h-32 lg:h-40 skeleton rounded"></div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="pt-16 lg:pt-20 min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-xl lg:text-2xl font-heading text-white mb-4">Product Not Found</h1>
            <Link to="/">
              <Button variant="outline" className="border-gold-500 text-gold-500">
                Go Back Home
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <main className="pt-16 lg:pt-20">
        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
          <Link to="/" className="inline-flex items-center text-white/60 hover:text-gold-500 transition-colors text-sm" data-testid="back-to-home">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Link>
        </div>

        {/* Product Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 lg:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
            {/* Product Image */}
            <div className="lg:sticky lg:top-24 lg:self-start" data-testid="product-image-container">
              <div className="aspect-square bg-card rounded-lg overflow-hidden border border-white/10">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Product Details */}
            <div className="space-y-5 lg:space-y-8" data-testid="product-details">
              {/* Title & Badges */}
              <div>
                {product.is_sold_out && (
                  <Badge variant="destructive" className="mb-2 lg:mb-3">Sold Out</Badge>
                )}
                <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white uppercase tracking-tight">
                  {product.name}
                </h1>
              </div>

              {/* Description */}
              <div className="prose prose-invert max-w-none">
                {(() => {
                  const plainText = product.description?.replace(/<[^>]*>/g, '') || '';
                  const shouldTruncate = plainText.length > DESCRIPTION_CHAR_LIMIT && !isDescriptionExpanded;
                  
                  return (
                    <>
                      <div 
                        className="rich-text-content text-white/80 leading-relaxed text-sm lg:text-base"
                        dangerouslySetInnerHTML={{ 
                          __html: shouldTruncate 
                            ? product.description.substring(0, DESCRIPTION_CHAR_LIMIT) + '...'
                            : product.description 
                        }}
                      />
                      {plainText.length > DESCRIPTION_CHAR_LIMIT && (
                        <button
                          onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                          className="text-gold-500 hover:text-gold-400 text-sm font-medium mt-2 transition-colors"
                          data-testid="description-toggle"
                        >
                          {isDescriptionExpanded ? 'See less' : 'See more...'}
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Variations */}
              {product.variations?.length > 0 && (
                <div className="space-y-3 lg:space-y-4" data-testid="variations-section">
                  <h3 className="font-heading text-base lg:text-lg font-semibold text-white uppercase tracking-wider">
                    Select Plan
                  </h3>
                  <RadioGroup 
                    value={selectedVariation} 
                    onValueChange={setSelectedVariation}
                    className="space-y-2 lg:space-y-3"
                  >
                    {product.variations.map((variation) => (
                      <div key={variation.id} className="relative">
                        <RadioGroupItem
                          value={variation.id}
                          id={variation.id}
                          className="peer sr-only"
                          data-testid={`variation-${variation.id}`}
                        />
                        <Label
                          htmlFor={variation.id}
                          className="flex items-center justify-between p-3 lg:p-4 bg-card border border-white/10 rounded-lg cursor-pointer transition-all peer-data-[state=checked]:border-gold-500 peer-data-[state=checked]:bg-gold-500/10 hover:border-white/30"
                        >
                          <div className="flex items-center gap-2 lg:gap-3">
                            <div className={`w-4 h-4 lg:w-5 lg:h-5 rounded-full border-2 flex items-center justify-center ${
                              selectedVariation === variation.id ? 'border-gold-500' : 'border-white/30'
                            }`}>
                              {selectedVariation === variation.id && (
                                <Check className="h-2.5 w-2.5 lg:h-3 lg:w-3 text-gold-500" />
                              )}
                            </div>
                            <span className="font-heading font-semibold text-white text-sm lg:text-base">
                              {variation.name}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-gold-500 text-sm lg:text-lg">
                              Rs {variation.price.toLocaleString()}
                            </span>
                            {variation.original_price && variation.original_price > variation.price && (
                              <span className="ml-2 text-white/40 line-through text-xs lg:text-sm">
                                Rs {variation.original_price.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {/* Price Summary */}
              <div className="bg-card/50 border border-white/10 rounded-lg p-4 lg:p-6 space-y-3 lg:space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-sm lg:text-base">Selected Plan:</span>
                  <span className="font-heading font-semibold text-white text-sm lg:text-base">{currentVariation?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-sm lg:text-base">Price:</span>
                  <div>
                    <span className="font-bold text-gold-500 text-xl lg:text-2xl">
                      Rs {currentVariation?.price?.toLocaleString()}
                    </span>
                    {currentVariation?.original_price && currentVariation.original_price > currentVariation.price && (
                      <span className="ml-2 text-white/40 line-through text-sm">
                        Rs {currentVariation.original_price.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Button */}
              <Button
                onClick={handleOrderNow}
                disabled={product.is_sold_out}
                className="w-full whatsapp-btn text-white font-heading text-base lg:text-lg uppercase tracking-wider py-5 lg:py-6 rounded-lg"
                data-testid="order-now-btn"
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Order Now via WhatsApp
              </Button>

              {/* Additional Info */}
              <div className="text-center text-white/40 text-xs lg:text-sm">
                <p>Questions? Contact us at support@gameshopnepal.com</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
