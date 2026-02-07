import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Upload, Check, Loader2, AlertTriangle, Copy, ChevronRight, Phone, Building2, FileText, MessageCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { paymentMethodsAPI, ordersAPI, uploadAPI } from '@/lib/api';

export default function PaymentPage() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [step, setStep] = useState('methods'); // 'methods' | 'details'
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Order data from URL params
  const orderTotal = searchParams.get('total') || '0';
  const orderItems = searchParams.get('items') || '';
  const customerName = searchParams.get('name') || '';
  const customerPhone = searchParams.get('phone') || '';
  
  // Screenshot upload
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const res = await paymentMethodsAPI.getAll();
      setPaymentMethods(res.data);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast.error('Failed to load payment methods');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectMethod = async (method) => {
    setSelectedMethod(method);
    setStep('details');
  };

  const handleBack = () => {
    if (step === 'details') {
      setStep('methods');
      setSelectedMethod(null);
    } else {
      navigate(-1);
    }
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size should not exceed 10MB');
        return;
      }
      setScreenshot(file);
      setScreenshotPreview(URL.createObjectURL(file));
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleProcessOrder = async () => {
    if (!screenshot) {
      toast.error('Please upload payment screenshot');
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload screenshot
      setIsUploading(true);
      const uploadRes = await uploadAPI.uploadImage(screenshot);
      const screenshotUrl = uploadRes.data.url;
      setIsUploading(false);

      // Save screenshot to order with payment method
      await ordersAPI.uploadPaymentScreenshot(orderId, screenshotUrl, selectedMethod?.name);

      // Generate WhatsApp message
      const whatsappNumber = '9779743488871';
      const message = `🛒 *New Order Payment*

📦 *Order ID:* ${orderId}
👤 *Name:* ${customerName}
📞 *Phone:* ${customerPhone}

💳 *Payment Method:* ${selectedMethod?.name}
💰 *Amount:* NPR ${parseFloat(orderTotal).toLocaleString()}

📝 *Items:* ${orderItems}

✅ Payment screenshot uploaded!

Please verify and process my order. 🙏`;

      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');
      
      toast.success('Order submitted! Please complete the conversation on WhatsApp.');
      navigate('/');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to process order. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <main className="pt-20 pb-16">
        <div className="max-w-lg mx-auto px-4">
          {/* Header */}
          <button 
            onClick={handleBack}
            className="flex items-center text-white/60 hover:text-gold-500 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {step === 'details' ? selectedMethod?.name : 'Back'}
          </button>

          {/* Amount Display */}
          <div className="text-center mb-6 py-4 bg-gradient-to-r from-gold-500/10 to-gold-500/5 rounded-xl border border-gold-500/20">
            <p className="text-white/60 text-sm">Amount to pay</p>
            <p className="text-4xl font-bold text-white mt-1">
              NPR {parseFloat(orderTotal).toLocaleString()}
            </p>
          </div>

          {/* Step 1: Payment Methods Selection */}
          {step === 'methods' && (
            <div className="space-y-3" data-testid="payment-methods-list">
              {paymentMethods.length === 0 ? (
                <div className="bg-card border border-white/10 rounded-xl p-8 text-center">
                  <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <p className="text-white/60">No payment methods available</p>
                </div>
              ) : (
                paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => handleSelectMethod(method)}
                    className="w-full bg-card border border-white/10 rounded-xl p-4 flex items-center justify-between hover:border-gold-500/50 hover:bg-card/80 transition-all group"
                    data-testid={`payment-method-${method.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center overflow-hidden">
                        <img 
                          src={method.image_url} 
                          alt={method.name}
                          className="w-8 h-8 object-contain"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      </div>
                      <span className="text-white font-semibold text-lg">{method.name}</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-white/40 group-hover:text-gold-500 transition-colors" />
                  </button>
                ))
              )}
            </div>
          )}

          {/* Step 2: Payment Details */}
          {step === 'details' && selectedMethod && (
            <div className="space-y-4" data-testid="payment-details">
              {/* Timer Warning */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-center justify-between">
                <p className="text-white text-sm">Order will be cancelled if you don't complete payment</p>
                <span className="text-red-400 font-mono font-bold">00:10:00</span>
              </div>

              {/* QR Code Section */}
              <div className="bg-card border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 bg-gold-500 rounded-full flex items-center justify-center text-black font-bold text-sm">1</div>
                  <span className="text-white font-semibold">Scan QR code to make payment</span>
                </div>
                
                {selectedMethod.qr_code_url ? (
                  <div className="bg-white rounded-xl p-4 max-w-[200px] mx-auto">
                    <img 
                      src={selectedMethod.qr_code_url} 
                      alt="Payment QR Code"
                      className="w-full"
                    />
                  </div>
                ) : (
                  <div className="bg-white/5 border border-dashed border-white/20 rounded-xl p-8 text-center">
                    <p className="text-white/40">QR code not available</p>
                  </div>
                )}

                {/* Merchant Details */}
                <div className="mt-4 bg-black/30 rounded-xl p-4 space-y-3">
                  {selectedMethod.merchant_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 flex items-center gap-2">
                        <Building2 className="h-4 w-4" /> Merchant Name
                      </span>
                      <button 
                        onClick={() => copyToClipboard(selectedMethod.merchant_name)}
                        className="text-white flex items-center gap-2 hover:text-gold-500"
                      >
                        {selectedMethod.merchant_name}
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {selectedMethod.phone_number && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 flex items-center gap-2">
                        <Phone className="h-4 w-4" /> Phone number
                      </span>
                      <button 
                        onClick={() => copyToClipboard(selectedMethod.phone_number)}
                        className="text-white flex items-center gap-2 hover:text-gold-500"
                      >
                        {selectedMethod.phone_number}
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Reference
                    </span>
                    <button 
                      onClick={() => copyToClipboard(orderId.slice(0, 12))}
                      className="text-white flex items-center gap-2 hover:text-gold-500 font-mono"
                    >
                      {orderId.slice(0, 12)}
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Payment Instructions */}
                {selectedMethod.instructions && (
                  <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">📢</span>
                      <div>
                        <p className="text-white font-bold uppercase tracking-wider text-sm mb-2">Payment Instructions</p>
                        <div className="text-white/80 text-sm whitespace-pre-line">
                          {selectedMethod.instructions}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Screenshot Section */}
              <div className="bg-card border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gold-500 rounded-full flex items-center justify-center text-black font-bold text-sm">2</div>
                    <span className="text-white font-semibold">Upload payment proof</span>
                  </div>
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full font-semibold">REQUIRED</span>
                </div>
                
                <p className="text-white/60 text-sm mb-4">You must upload payment proof to proceed.</p>
                
                <label className="block cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleScreenshotChange}
                    className="hidden"
                    data-testid="screenshot-upload-input"
                  />
                  
                  {screenshotPreview ? (
                    <div className="border-2 border-green-500/50 border-dashed rounded-xl p-4 bg-green-500/5">
                      <img 
                        src={screenshotPreview} 
                        alt="Payment screenshot" 
                        className="max-h-48 mx-auto rounded-lg"
                      />
                      <div className="flex items-center justify-center gap-2 mt-3 text-green-400">
                        <Check className="h-4 w-4" />
                        <span className="text-sm">Screenshot uploaded</span>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-white/20 border-dashed rounded-xl p-8 text-center hover:border-gold-500/50 transition-colors">
                      <Upload className="h-8 w-8 text-white/40 mx-auto mb-3" />
                      <p className="text-white font-medium">Drag a file here or click to select one</p>
                      <p className="text-white/40 text-sm mt-2">
                        Attach bank receipt or transaction screenshot for fast confirmation. File should not exceed 10mb.
                      </p>
                    </div>
                  )}
                </label>
              </div>

              {/* Process Order Button */}
              <div className="bg-card border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 bg-gold-500 rounded-full flex items-center justify-center text-black font-bold text-sm">3</div>
                  <span className="text-white font-semibold">Did you pay?</span>
                </div>
                
                <Button
                  onClick={handleProcessOrder}
                  disabled={!screenshot || isSubmitting}
                  className="w-full bg-black hover:bg-black/80 text-white py-6 text-lg font-semibold disabled:opacity-50"
                  data-testid="process-order-btn"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      {isUploading ? 'Uploading...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-5 w-5 mr-2" />
                      I have paid
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
