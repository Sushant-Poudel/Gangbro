import { useEffect, useState } from 'react';
import { RefreshCw, ExternalLink, Store, ShoppingCart, AlertTriangle, FileText } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { takeappAPI } from '@/lib/api';

export default function AdminTakeApp() {
  const [storeInfo, setStoreInfo] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [storeRes, ordersRes] = await Promise.all([
        takeappAPI.getStore().catch(err => { if (err.response?.status === 400) setApiKeyMissing(true); throw err; }),
        takeappAPI.getOrders().catch(() => ({ data: [] })),
      ]);
      setStoreInfo(storeRes.data);
      setOrders(ordersRes.data);
    } catch (error) {
      if (!apiKeyMissing) console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
    toast.success('Data refreshed!');
  };

  const handleSyncOrders = async () => {
    setIsRefreshing(true);
    try {
      const response = await takeappAPI.syncOrders();
      toast.success(`Synced ${response.data.synced} new orders, updated ${response.data.updated} existing orders`);
      await fetchData();
    } catch (error) {
      toast.error('Failed to sync orders');
      console.error(error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'ORDER_STATUS_PENDING': { label: 'Pending', className: 'bg-yellow-500/20 text-yellow-400' },
      'ORDER_STATUS_COMPLETED': { label: 'Completed', className: 'bg-green-500/20 text-green-400' },
      'ORDER_STATUS_CANCELLED': { label: 'Cancelled', className: 'bg-red-500/20 text-red-400' },
      'ORDER_STATUS_PROCESSING': { label: 'Processing', className: 'bg-blue-500/20 text-blue-400' },
    };
    const config = statusMap[status] || { label: status?.replace('ORDER_STATUS_', '') || 'Unknown', className: 'bg-gray-500/20 text-gray-400' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (apiKeyMissing) {
    return (
      <AdminLayout title="Take.app Integration">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6" data-testid="takeapp-api-missing">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-heading text-lg font-semibold text-yellow-500 mb-2">Take.app API Key Required</h3>
              <p className="text-white/60 mb-4">To use Take.app integration, you need to add your API key to the backend environment variables.</p>
              <div className="bg-black/50 rounded-lg p-4 text-sm"><code className="text-gold-500">TAKEAPP_API_KEY=your_api_key_here</code></div>
              <p className="text-white/40 text-sm mt-4">Get your API key from <a href="https://take.app/settings/api" target="_blank" rel="noopener noreferrer" className="text-gold-500 hover:underline">Take.app Settings</a></p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Take.app Integration">
      <div className="space-y-4 lg:space-y-6" data-testid="admin-takeapp">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-white/60 text-sm lg:text-base">View and sync orders from Take.app with customer accounts</p>
          <div className="flex gap-2">
            <Button onClick={handleSyncOrders} disabled={isRefreshing} className="bg-gold-500 hover:bg-gold-600 text-black">
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />Sync to Customers
            </Button>
            <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline" className="border-gold-500 text-gold-500">
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />Refresh
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-24 skeleton rounded-lg"></div>
            <div className="h-64 skeleton rounded-lg"></div>
          </div>
        ) : (
          <>
            {/* Store Info */}
            {storeInfo && (
              <div className="bg-card border border-white/10 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Store className="h-5 w-5 text-gold-500" />
                    <div>
                      <h2 className="font-heading text-lg font-semibold text-white">{storeInfo.name || 'Store'}</h2>
                      <p className="text-white/40 text-sm">@{storeInfo.alias}</p>
                    </div>
                  </div>
                  <a 
                    href={`https://take.app/${storeInfo.alias}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-gold-500 hover:text-gold-400 flex items-center gap-1 text-sm"
                  >
                    Visit Store <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Recent Orders */}
            <div className="bg-card border border-white/10 rounded-lg p-4 lg:p-6">
              <div className="flex items-center gap-3 mb-4">
                <ShoppingCart className="h-5 w-5 text-gold-500" />
                <h2 className="font-heading text-lg font-semibold text-white uppercase">Recent Orders</h2>
                <span className="text-white/40 text-sm">({Math.min(orders.length, 10)} of {orders.length})</span>
              </div>
              
              {orders.length === 0 ? (
                <p className="text-white/40 text-center py-8">No orders yet</p>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 10).map((order) => (
                    <div 
                      key={order.id} 
                      className="bg-black/50 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-gold-500 font-heading font-semibold">#{order.number}</span>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-white font-medium">{order.customerName || order.customer_name || 'Unknown'}</p>
                        <p className="text-white/40 text-xs">{formatDate(order.createdAt || order.created_at)}</p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-gold-500 font-bold text-lg">
                            Rs {((order.totalAmount || order.total_amount || 0) / 100).toLocaleString()}
                          </p>
                        </div>
                        
                        {order.invoiceUrl && (
                          <a 
                            href={order.invoiceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-white/60 hover:text-gold-500 transition-colors"
                          >
                            <FileText className="h-4 w-4" />
                            <span className="text-sm hidden sm:inline">Invoice</span>
                          </a>
                        )}
                        
                        <a 
                          href={`https://take.app/${storeInfo?.alias}/orders/${order.id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-white/60 hover:text-gold-500 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span className="text-sm hidden sm:inline">View</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {orders.length > 10 && (
                <div className="mt-4 text-center">
                  <a 
                    href={`https://take.app/${storeInfo?.alias}/orders`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gold-500 hover:underline text-sm"
                  >
                    View all {orders.length} orders on Take.app →
                  </a>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
