import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, KeyRound, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CustomerAuthModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState('email'); // 'email' or 'otp'
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/customer/send-otp`, {
        email: email.toLowerCase().trim(),
        name: name || email.split('@')[0]
      });
      
      // Check if debug mode returned OTP
      if (response.data.otp) {
        toast.success(`OTP sent! Debug mode: ${response.data.otp}`, { duration: 10000 });
      } else {
        toast.success('OTP sent to your email! Check your inbox.');
      }
      setStep('otp');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/customer/verify-otp`, {
        email: email.toLowerCase().trim(),
        otp: otp
      });
      
      // Store token and customer info
      localStorage.setItem('customer_token', response.data.token);
      localStorage.setItem('customer_info', JSON.stringify(response.data.customer));
      
      toast.success('Login successful! Welcome back 🎉');
      onSuccess && onSuccess(response.data.customer);
      onClose();
      
      // Reset form
      setEmail('');
      setName('');
      setOtp('');
      setStep('email');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/customer/send-otp`, {
        email: email.toLowerCase().trim(),
        name: name || email.split('@')[0]
      });
      toast.success('New OTP sent!');
      setOtp('');
    } catch (error) {
      toast.error('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-black border-white/20" data-testid="customer-auth-modal">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading uppercase text-gold-500">
            {step === 'email' ? 'Login / Sign Up' : 'Enter OTP'}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {step === 'email' 
              ? 'Get instant access to your order history and wishlist'
              : `We've sent a 6-digit code to ${email}`
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'email' ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-white">Name (Optional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-black border-white/20 text-white"
                data-testid="customer-name-input"
              />
            </div>
            
            <div>
              <Label htmlFor="email" className="text-white">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-white/40" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-black border-white/20 text-white pl-10"
                  required
                  data-testid="customer-email-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gold-500 hover:bg-gold-600 text-black font-bold"
              disabled={loading}
              data-testid="send-otp-button"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send OTP
                </>
              )}
            </Button>

            <p className="text-xs text-white/40 text-center">
              No password needed! We'll send you a one-time code.
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <Label htmlFor="otp" className="text-white">6-Digit Code</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-5 w-5 text-white/40" />
                <Input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="bg-black border-white/20 text-white pl-10 text-center text-2xl font-mono tracking-widest"
                  maxLength={6}
                  required
                  data-testid="otp-input"
                  autoFocus
                />
              </div>
              <p className="text-xs text-white/40 mt-2">
                Code expires in 10 minutes
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-gold-500 hover:bg-gold-600 text-black font-bold"
              disabled={loading || otp.length !== 6}
              data-testid="verify-otp-button"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Login'
              )}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setOtp('');
                }}
                className="text-white/60 hover:text-gold-500"
              >
                ← Change Email
              </button>
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                className="text-gold-500 hover:text-gold-400 disabled:opacity-50"
              >
                Resend OTP
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Hook to check if customer is logged in
export function useCustomerAuth() {
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useState(() => {
    const token = localStorage.getItem('customer_token');
    const customerInfo = localStorage.getItem('customer_info');
    
    if (token && customerInfo) {
      try {
        setCustomer(JSON.parse(customerInfo));
      } catch (e) {
        localStorage.removeItem('customer_token');
        localStorage.removeItem('customer_info');
      }
    }
    setIsLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_info');
    setCustomer(null);
    toast.success('Logged out successfully');
  };

  const login = (customerData) => {
    setCustomer(customerData);
  };

  return { customer, isLoading, logout, login, isAuthenticated: !!customer };
}
