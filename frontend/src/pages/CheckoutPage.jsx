import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Trash2, Loader2, Ticket, X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useCart } from '@/components/Cart';
import { useLanguage } from '@/components/Language';
import { ordersAPI, promoCodesAPI, settingsAPI } from '@/lib/api';
import { useEffect } from 'react';

export default function CheckoutPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { cart, removeFromCart, clearCart, getCartTotal } = useCart();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderForm, setOrderForm] = useState({ customer_name: '', customer_phone: '', customer_email: '', remark: '' });
  
  // Promo code
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  
  // Pricing settings
  const [pricingSettings, setPricingSettings] = useState({ service_charge: 0, tax_percentage: 0, tax_label: 'Tax' });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await settingsAPI.get();
        setPricingSettings(res.data);
      } catch (e) {
        console.log('Using default pricing');
      }
    };
    fetchSettings();
  }, []);

  const subtotal = getCartTotal();
  const discountAmount = promoDiscount?.discount_amount || 0;
  const afterDiscount = subtotal - discountAmount;
  const serviceCharge = parseFloat(pricingSettings.service_charge) || 0;
  const taxPercentage = parseFloat(pricingSettings.tax_percentage) || 0;
  const taxAmount = afterDiscount * (taxPercentage / 100);
  const total = afterDiscount + serviceCharge + taxAmount;

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setIsValidatingPromo(true);
    try {
      const res = await promoCodesAPI.validate(promoCode.trim(), subtotal);
      setPromoDiscount(res.data);
      toast.success(`Promo code applied! You save Rs ${res.data.discount_amount}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid promo code');
      setPromoDiscount(null);
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoCode('');
    setPromoDiscount(null);
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (isSubmitting || cart.length === 0) return;
    if (!orderForm.customer_name || !orderForm.customer_phone) {
      toast.error('Please fill in your name and phone number');
      return;
    }

    setIsSubmitting(true);
    try {
      let fullRemark = '';
      if (promoDiscount) {
        fullRemark += `Promo Code: ${promoDiscount.code} (-Rs ${promoDiscount.discount_amount})\n`;
      }
      if (orderForm.remark) fullRemark += `Notes: ${orderForm.remark}`;

      const orderPayload = {
        customer_name: orderForm.customer_name,
        customer_phone: orderForm.customer_phone,
        customer_email: orderForm.customer_email || null,
        items: cart.map(item => ({
          name: item.product.name,
          price: item.variation.price,
          quantity: item.quantity,
          variation: item.variation.name
        })),
        total_amount: total,
        remark: fullRemark.trim() || null
      };

      const res = await ordersAPI.create(orderPayload);
      
      // Redirect to our custom payment page
      const params = new URLSearchParams({
        total: total.toFixed(2),
        items: cart.map(item => `${item.product.name} (${item.variation.name} x${item.quantity})`).join(', '),
        name: orderForm.customer_name,
        phone: orderForm.customer_phone
      });
      
      clearCart();
      navigate(`/payment/${res.data.order_id}?${params.toString()}`);
    } catch (error) {
      console.error('Order error:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPayment = () => {
    // Removed - we now redirect to /payment/:orderId
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="pt-24 pb-16 max-w-2xl mx-auto px-4 text-center">
          <ShoppingBag className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">{t('cartEmpty')}</h1>
          <p className="text-gray-400 mb-6">{t('addProductsToStart')}</p>
          <Link to="/">
            <Button className="bg-amber-500 hover:bg-amber-600 text-black">{t('browseProducts')}</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          <Link to="/" className="inline-flex items-center text-gray-400 hover:text-amber-500 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />{t('backToProducts')}
          </Link>
          
          <h1 className="text-2xl font-bold text-white mb-6">Checkout ({cart.length} items)</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <h2 className="text-white font-semibold mb-4">Your Items</h2>
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={`${item.product.id}-${item.variation.id}`} className="flex gap-3 p-3 bg-black/50 rounded-lg">
                      <img src={item.product.image_url} alt={item.product.name} className="w-16 h-16 rounded object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{item.product.name}</p>
                        <p className="text-gray-400 text-sm">{item.variation.name} × {item.quantity}</p>
                        <p className="text-amber-500 font-semibold">Rs {(item.variation.price * item.quantity).toLocaleString()}</p>
                      </div>
                      <button onClick={() => removeFromCart(item.product.id, item.variation.id)} className="text-gray-400 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Order Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmitOrder} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4 sticky top-24">
                <h2 className="text-white font-semibold">Your Details</h2>
                
                <div>
                  <Label className="text-gray-400 text-sm">{t('fullName')} *</Label>
                  <Input value={orderForm.customer_name} onChange={e => setOrderForm({...orderForm, customer_name: e.target.value})} className="bg-black border-zinc-700 mt-1" required />
                </div>
                <div>
                  <Label className="text-gray-400 text-sm">{t('phoneNumber')} *</Label>
                  <Input value={orderForm.customer_phone} onChange={e => setOrderForm({...orderForm, customer_phone: e.target.value})} className="bg-black border-zinc-700 mt-1" required />
                </div>
                <div>
                  <Label className="text-gray-400 text-sm">{t('email')}</Label>
                  <Input type="email" value={orderForm.customer_email} onChange={e => setOrderForm({...orderForm, customer_email: e.target.value})} className="bg-black border-zinc-700 mt-1" />
                </div>
                <div>
                  <Label className="text-gray-400 text-sm">{t('notes')}</Label>
                  <Textarea value={orderForm.remark} onChange={e => setOrderForm({...orderForm, remark: e.target.value})} className="bg-black border-zinc-700 mt-1" rows={2} />
                </div>
                
                {/* Promo Code */}
                <div className="pt-3 border-t border-zinc-800">
                  <Label className="text-gray-400 text-sm flex items-center gap-2 mb-2">
                    <Ticket className="w-4 h-4 text-amber-500" />{t('promoCode')}
                  </Label>
                  {promoDiscount ? (
                    <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
                      <span className="text-green-400 font-semibold">{promoDiscount.code} <span className="font-normal text-sm">-Rs {promoDiscount.discount_amount}</span></span>
                      <button type="button" onClick={handleRemovePromo} className="text-gray-400 hover:text-red-400"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} className="bg-black border-zinc-700 uppercase" placeholder="Code" />
                      <Button type="button" onClick={handleApplyPromo} disabled={isValidatingPromo} variant="outline" className="border-amber-500 text-amber-500">
                        {isValidatingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : t('apply')}
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Price Summary */}
                <div className="pt-3 border-t border-zinc-800 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-gray-400">{t('subtotal')}</span><span className="text-white">Rs {subtotal.toLocaleString()}</span></div>
                  {promoDiscount && <div className="flex justify-between text-sm"><span className="text-green-400">{t('discount')}</span><span className="text-green-400">-Rs {discountAmount}</span></div>}
                  {serviceCharge > 0 && <div className="flex justify-between text-sm"><span className="text-gray-400">{t('serviceCharge')}</span><span className="text-white">Rs {serviceCharge}</span></div>}
                  {taxPercentage > 0 && <div className="flex justify-between text-sm"><span className="text-gray-400">{pricingSettings.tax_label} ({taxPercentage}%)</span><span className="text-white">Rs {taxAmount.toFixed(2)}</span></div>}
                  <div className="flex justify-between pt-2 border-t border-zinc-800"><span className="text-white font-semibold">{t('total')}</span><span className="text-amber-500 font-bold text-lg">Rs {total.toFixed(2)}</span></div>
                </div>
                
                <Button type="submit" disabled={isSubmitting} className="w-full bg-amber-500 hover:bg-amber-600 text-black py-6">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : <><ShoppingBag className="w-4 h-4 mr-2" />{t('proceedToCheckout')}</>}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
