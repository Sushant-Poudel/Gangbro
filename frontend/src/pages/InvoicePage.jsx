import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Download, Printer, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ordersAPI } from '@/lib/api';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_8ec93a6a-4f80-4dde-b760-4bc71482fa44/artifacts/4uqt5osn_Staff.zip%20-%201.png";

export default function InvoicePage() {
  const { orderId } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInvoice();
  }, [orderId]);

  const fetchInvoice = async () => {
    try {
      const res = await ordersAPI.getInvoice(orderId);
      setInvoice(res.data);
    } catch (error) {
      console.error('Error:', error);
      setError('Invoice not found');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Invoice Not Found</h1>
          <p className="text-gray-600">The invoice you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const order = invoice.order;
  const subtotal = order.subtotal || order.total || 0;
  const serviceCharge = order.service_charge || 0;
  const tax = order.tax || 0;
  const total = order.total || 0;

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:py-0 print:bg-white">
      {/* Print/Download buttons - hidden when printing */}
      <div className="max-w-3xl mx-auto px-4 mb-4 print:hidden">
        <div className="flex justify-end gap-2">
          <Button onClick={handlePrint} variant="outline" className="bg-white">
            <Printer className="h-4 w-4 mr-2" />
            Print Invoice
          </Button>
        </div>
      </div>

      {/* Invoice Container */}
      <div className="max-w-3xl mx-auto bg-white shadow-lg print:shadow-none" id="invoice">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-8 py-6">
          <div className="flex justify-between items-start">
            <div>
              <img src={LOGO_URL} alt="GameShop Nepal" className="h-10 mb-2" />
              <p className="text-gray-400 text-sm">Digital Products at Best Prices</p>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold text-gold-500">INVOICE</h1>
              <p className="text-gray-400 text-sm mt-1">{invoice.invoice_number}</p>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="px-8 py-4 bg-green-50 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-700 font-semibold">
              {order.status === 'Completed' ? 'Payment Completed' : order.status === 'Confirmed' ? 'Payment Confirmed' : order.status}
            </span>
          </div>
          <span className="text-gray-500 text-sm">
            {new Date(order.created_at).toLocaleDateString('en-US', { 
              year: 'numeric', month: 'long', day: 'numeric' 
            })}
          </span>
        </div>

        {/* Order & Customer Info */}
        <div className="px-8 py-6 grid grid-cols-2 gap-8 border-b">
          <div>
            <h3 className="text-gray-500 text-xs uppercase tracking-wider mb-2">Bill To</h3>
            <p className="font-semibold text-gray-800">{order.customer_name || 'Customer'}</p>
            {order.customer_phone && <p className="text-gray-600 text-sm">{order.customer_phone}</p>}
            {order.customer_email && <p className="text-gray-600 text-sm">{order.customer_email}</p>}
          </div>
          <div className="text-right">
            <h3 className="text-gray-500 text-xs uppercase tracking-wider mb-2">Order Details</h3>
            <p className="text-gray-800"><span className="text-gray-500">Order ID:</span> #{orderId.slice(0, 8).toUpperCase()}</p>
            <p className="text-gray-800"><span className="text-gray-500">Payment:</span> {order.payment_method || 'N/A'}</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="px-8 py-6">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 text-gray-500 text-xs uppercase tracking-wider">Item</th>
                <th className="text-center py-3 text-gray-500 text-xs uppercase tracking-wider">Qty</th>
                <th className="text-right py-3 text-gray-500 text-xs uppercase tracking-wider">Price</th>
                <th className="text-right py-3 text-gray-500 text-xs uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items && order.items.length > 0 ? (
                order.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-4">
                      <p className="font-medium text-gray-800">{item.product_name}</p>
                      {item.variation_name && (
                        <p className="text-gray-500 text-sm">{item.variation_name}</p>
                      )}
                    </td>
                    <td className="text-center text-gray-600">{item.quantity || 1}</td>
                    <td className="text-right text-gray-600">Rs {(item.price || 0).toLocaleString()}</td>
                    <td className="text-right font-medium text-gray-800">Rs {((item.price || 0) * (item.quantity || 1)).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-gray-100">
                  <td className="py-4 font-medium text-gray-800" colSpan="4">
                    {order.items_text || 'Order items'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-8 py-6 bg-gray-50">
          <div className="max-w-xs ml-auto space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>Rs {subtotal.toLocaleString()}</span>
            </div>
            {serviceCharge > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Service Charge</span>
                <span>Rs {serviceCharge.toLocaleString()}</span>
              </div>
            )}
            {tax > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax (5%)</span>
                <span>Rs {tax.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
              <span>Total</span>
              <span className="text-gold-600">Rs {total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t text-center">
          <p className="text-gray-500 text-sm mb-2">Thank you for your business!</p>
          <p className="text-gray-400 text-xs">
            GameShop Nepal | gameshopnepal.buy@gmail.com | www.gameshopnepal.com
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
