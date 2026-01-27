import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Shield, Clock, Check } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { productsAPI } from '@/lib/api';

const WHATSAPP_NUMBER = "9779743488871";

export default function ProductPage() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
        <div className="pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="aspect-square skeleton rounded-lg"></div>
            <div className="space-y-6">
              <div className="h-10 w-3/4 skeleton rounded"></div>
              <div className="h-6 w-1/4 skeleton rounded"></div>
              <div className="h-40 skeleton rounded"></div>
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
        <div className="pt-20 min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-heading text-white mb-4">Product Not Found</h1>
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
      
      <main className="pt-20">
        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link to="/" className="inline-flex items-center text-white/60 hover:text-gold-500 transition-colors" data-testid="back-to-home">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Link>
        </div>

        {/* Product Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Image */}
            <div className="lg:sticky lg:top-24 lg:self-start" data-testid="product-image-container">
              <div className="aspect-square bg-card rounded-lg overflow-hidden border border-white/10">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Trust Badges under image */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 bg-card/50 p-4 rounded-lg border border-white/10">
                  <Shield className="h-5 w-5 text-gold-500" />
                  <span className="text-white/80 text-sm">Genuine Product</span>
                </div>
                <div className="flex items-center gap-3 bg-card/50 p-4 rounded-lg border border-white/10">
                  <Clock className="h-5 w-5 text-gold-500" />
                  <span className="text-white/80 text-sm">Instant Delivery</span>
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="space-y-8" data-testid="product-details">
              {/* Title & Badges */}
              <div>
                {product.is_sold_out && (
                  <Badge variant="destructive" className="mb-3">Sold Out</Badge>
                )}
                <h1 className="font-heading text-4xl md:text-5xl font-bold text-white uppercase tracking-tight">
                  {product.name}
                </h1>
              </div>

              {/* Description */}
              <div className="prose prose-invert max-w-none">
                <div 
                  className="rich-text-content text-white/80 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>

              {/* Variations */}
              {product.variations?.length > 0 && (
                <div className="space-y-4" data-testid="variations-section">
                  <h3 className="font-heading text-lg font-semibold text-white uppercase tracking-wider">
                    Select Plan
                  </h3>
                  <RadioGroup 
                    value={selectedVariation} 
                    onValueChange={setSelectedVariation}
                    className="space-y-3"
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
                          className="flex items-center justify-between p-4 bg-card border border-white/10 rounded-lg cursor-pointer transition-all peer-data-[state=checked]:border-gold-500 peer-data-[state=checked]:bg-gold-500/10 hover:border-white/30"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full border-2 border-white/30 flex items-center justify-center peer-data-[state=checked]:border-gold-500">
                              {selectedVariation === variation.id && (
                                <Check className="h-3 w-3 text-gold-500" />
                              )}
                            </div>
                            <span className="font-heading font-semibold text-white">
                              {variation.name}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-gold-500 text-lg">
                              Rs {variation.price.toLocaleString()}
                            </span>
                            {variation.original_price && variation.original_price > variation.price && (
                              <span className="ml-2 text-white/40 line-through text-sm">
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
              <div className="bg-card/50 border border-white/10 rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Selected Plan:</span>
                  <span className="font-heading font-semibold text-white">{currentVariation?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Price:</span>
                  <div>
                    <span className="font-bold text-gold-500 text-2xl">
                      Rs {currentVariation?.price?.toLocaleString()}
                    </span>
                    {currentVariation?.original_price && currentVariation.original_price > currentVariation.price && (
                      <span className="ml-2 text-white/40 line-through">
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
                className="w-full whatsapp-btn text-white font-heading text-lg uppercase tracking-wider py-6 rounded-lg"
                data-testid="order-now-btn"
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Order Now via WhatsApp
              </Button>

              {/* Additional Info */}
              <div className="text-center text-white/40 text-sm">
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
