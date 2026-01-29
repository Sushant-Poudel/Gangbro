import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Check, ShoppingCart, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { productsAPI, ordersAPI } from '@/lib/api';

export default function ProductPage() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderStep, setOrderStep] = useState('form'); // 'form', 'payment'
  const [orderData, setOrderData] = useState(null);
  const [orderForm, setOrderForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    custom_fields: {},
    remark: ''
  });

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

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    
    // Prevent duplicate submissions
    if (isSubmitting) {
      return;
    }
    
    if (!orderForm.customer_name || !orderForm.customer_phone) {
      toast.error('Please fill in your name and phone number');
      return;
    }

    setIsSubmitting(true);
    try {
      // Build remark with custom field values
      let fullRemark = '';
      if (product.custom_fields && product.custom_fields.length > 0) {
        product.custom_fields.forEach(field => {
          const value = orderForm.custom_fields[field.id];
          if (value) {
            fullRemark += `${field.label}: ${value}\n`;
          }
        });
      }
      if (orderForm.remark) {
        fullRemark += `Notes: ${orderForm.remark}`;
      }

      const orderPayload = {
        customer_name: orderForm.customer_name,
        customer_phone: orderForm.customer_phone,
        customer_email: orderForm.customer_email || null,
        items: [{
          name: product.name,
          price: currentVariation.price, // Price in rupees
          quantity: 1,
          variation: currentVariation.name
        }],
        total_amount: currentVariation.price, // Price in rupees
        remark: fullRemark.trim() || null
      };

      const res = await ordersAPI.create(orderPayload);
      
      setOrderData({
        order_id: res.data.order_id,
        takeapp_order_id: res.data.takeapp_order_id,
        payment_url: res.data.payment_url
      });
      
      // Move to payment step
      setOrderStep('payment');
      
      if (!res.data.payment_url) {
        toast.warning('Order created but payment link not available. Please contact support.');
      }
      
    } catch (error) {
      console.error('Order error:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPayment = () => {
    if (orderData?.payment_url) {
      window.open(orderData.payment_url, '_blank');
    } else {
      toast.error('Payment URL not available. Please try again.');
    }
  };

  const handleCloseDialog = () => {
    setIsOrderDialogOpen(false);
    setOrderStep('form');
    setOrderData(null);
    setOrderForm({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      custom_fields: {},
      remark: ''
    });
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 lg:py-4">
          <Link to="/" className="inline-flex items-center text-white/60 hover:text-gold-500 transition-colors text-sm" data-testid="back-to-home">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Link>
        </div>

        {/* Product Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 lg:pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-10">
            {/* Product Image */}
            <div className="lg:sticky lg:top-24 lg:self-start" data-testid="product-image-container">
              <div className="aspect-square bg-card rounded-lg overflow-hidden border border-white/10 animate-fade-in">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>

            {/* Product Details */}
            <div className="space-y-4 lg:space-y-6 animate-slide-up" data-testid="product-details">
              {/* Title & Badges */}
              <div>
                {product.is_sold_out && (
                  <Badge variant="destructive" className="mb-2">Sold Out</Badge>
                )}
                <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-white uppercase tracking-tight">
                  {product.name}
                </h1>
              </div>

              {/* Variations */}
              {product.variations?.length > 0 && (
                <div className="space-y-3" data-testid="variations-section">
                  <h3 className="font-heading text-sm lg:text-base font-semibold text-white uppercase tracking-wider">
                    Select Plan
                  </h3>
                  <RadioGroup 
                    value={selectedVariation} 
                    onValueChange={setSelectedVariation}
                    className="space-y-2"
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
                          className="flex items-center justify-between p-3 bg-card border border-white/10 rounded-lg cursor-pointer transition-all duration-300 peer-data-[state=checked]:border-gold-500 peer-data-[state=checked]:bg-gold-500/10 hover:border-white/30 hover:scale-[1.01]"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                              selectedVariation === variation.id ? 'border-gold-500' : 'border-white/30'
                            }`}>
                              {selectedVariation === variation.id && (
                                <Check className="h-2.5 w-2.5 text-gold-500" />
                              )}
                            </div>
                            <span className="font-heading font-semibold text-white text-sm">
                              {variation.name}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-gold-500 text-sm lg:text-base">
                              Rs {variation.price.toLocaleString()}
                            </span>
                            {variation.original_price && variation.original_price > variation.price && (
                              <span className="ml-2 text-white/40 line-through text-xs">
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
              <div className="bg-card/50 border border-white/10 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-sm">Selected Plan:</span>
                  <span className="font-heading font-semibold text-white text-sm">{currentVariation?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-sm">Price:</span>
                  <div>
                    <span className="font-bold text-gold-500 text-xl">
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
              <div className="space-y-2">
                <Button
                  onClick={() => setIsOrderDialogOpen(true)}
                  disabled={product.is_sold_out}
                  className="w-full bg-gold-500 hover:bg-gold-600 text-black font-heading text-base uppercase tracking-wider py-5 rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-gold-500/20"
                  data-testid="order-now-btn"
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Order Now
                </Button>
                
                {/* Notes under Order Button */}
                <p className="text-white/50 text-xs text-center flex items-center justify-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Please read the description below before ordering.
                </p>
                <p className="text-white/40 text-xs text-center">
                  By ordering, you agree to our <Link to="/terms" className="text-gold-500 hover:underline">Terms & Conditions</Link>
                </p>
              </div>

              {/* Description - Now below Order Button */}
              <div className="prose prose-invert max-w-none pt-2 border-t border-white/10">
                <h3 className="font-heading text-sm lg:text-base font-semibold text-white uppercase tracking-wider mb-2">
                  Description
                </h3>
                <div 
                  className="rich-text-content text-white/80 leading-relaxed text-sm"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>

              {/* Additional Info */}
              <div className="text-center text-white/40 text-xs pt-2">
                <p>Questions? Contact us via our social media</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Order Dialog */}
      <Dialog open={isOrderDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="bg-card border-white/10 text-white max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl uppercase">
              {orderStep === 'form' && 'Place Your Order'}
              {orderStep === 'payment' && 'Complete Payment'}
              {orderStep === 'screenshot' && 'Upload Payment Screenshot'}
              {orderStep === 'success' && 'Order Submitted!'}
            </DialogTitle>
          </DialogHeader>

          {/* Step 1: Order Form */}
          {orderStep === 'form' && (
            <form onSubmit={handleSubmitOrder} className="space-y-4">
              {/* Order Summary */}
              <div className="bg-black/50 rounded-lg p-3 flex items-center gap-3">
                <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{product.name}</p>
                  <p className="text-white/60 text-xs">{currentVariation?.name}</p>
                </div>
                <p className="text-gold-500 font-bold">Rs {currentVariation?.price?.toLocaleString()}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-white/80 text-sm">Full Name *</Label>
                  <Input
                    value={orderForm.customer_name}
                    onChange={(e) => setOrderForm({...orderForm, customer_name: e.target.value})}
                    className="bg-black border-white/20 mt-1 text-base"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <Label className="text-white/80 text-sm">Phone Number *</Label>
                  <Input
                    value={orderForm.customer_phone}
                    onChange={(e) => setOrderForm({...orderForm, customer_phone: e.target.value})}
                    className="bg-black border-white/20 mt-1 text-base"
                    placeholder="9801234567"
                    required
                  />
                </div>

                <div>
                  <Label className="text-white/80 text-sm">Email (optional)</Label>
                  <Input
                    type="email"
                    value={orderForm.customer_email}
                    onChange={(e) => setOrderForm({...orderForm, customer_email: e.target.value})}
                    className="bg-black border-white/20 mt-1 text-base"
                    placeholder="your@email.com"
                  />
                </div>

                {/* Game Account Details */}
                <div className="pt-2 border-t border-white/10">
                  <p className="text-white/60 text-xs mb-3">Game Account Details (if applicable)</p>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-white/80 text-sm">Enter your User ID :</Label>
                      <Input
                        value={orderForm.user_id}
                        onChange={(e) => setOrderForm({...orderForm, user_id: e.target.value})}
                        className="bg-black border-white/20 mt-1 text-base"
                        placeholder="Your game User ID"
                      />
                    </div>

                    <div>
                      <Label className="text-white/80 text-sm">Enter your Server ID :</Label>
                      <Input
                        value={orderForm.server_id}
                        onChange={(e) => setOrderForm({...orderForm, server_id: e.target.value})}
                        className="bg-black border-white/20 mt-1 text-base"
                        placeholder="Your game Server ID"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-white/80 text-sm">Notes (optional)</Label>
                  <Textarea
                    value={orderForm.remark}
                    onChange={(e) => setOrderForm({...orderForm, remark: e.target.value})}
                    className="bg-black border-white/20 mt-1 text-base min-h-[60px]"
                    placeholder="Any special instructions..."
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseDialog}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gold-500 hover:bg-gold-600 text-black"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Continue to Payment'
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Step 2: Payment */}
          {orderStep === 'payment' && (
            <div className="space-y-4 py-2">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Order Created!</h3>
                <p className="text-white/60 text-sm">
                  Click the button below to complete your payment on Take.app
                </p>
              </div>
              
              <div className="bg-black/50 rounded-lg p-3 space-y-2">
                <div>
                  <p className="text-white/60 text-xs mb-1">Order ID:</p>
                  <p className="text-white font-mono text-sm truncate">{orderData?.takeapp_order_id || orderData?.order_id}</p>
                </div>
              </div>

              <Button
                onClick={handleOpenPayment}
                className="w-full bg-gold-500 hover:bg-gold-600 text-black"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Complete Payment on Take.app
              </Button>
              
              <p className="text-white/40 text-xs text-center">
                You will be redirected to Take.app to complete your payment and upload proof.
              </p>
              
              <Button
                variant="ghost"
                onClick={handleCloseDialog}
                className="w-full text-white/60"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
