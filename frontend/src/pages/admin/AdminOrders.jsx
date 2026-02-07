import { useEffect, useState } from 'react';
import { RefreshCw, Search, Package, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, Mail, Phone, User, Calendar, FileText } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ordersAPI, orderTrackingAPI } from '@/lib/api';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', icon: Clock, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'confirmed', label: 'Confirmed', icon: CheckCircle, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  
  // Status update dialog
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const response = await ordersAPI.getAll();
      // Sort by date descending
      const sortedOrders = response.data.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      setOrders(sortedOrders);
      setFilteredOrders(sortedOrders);
    } catch (error) {
      toast.error('Failed to load orders');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Filter orders based on search and status
  useEffect(() => {
    let filtered = orders;

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.customer_name?.toLowerCase().includes(search) ||
        order.customer_email?.toLowerCase().includes(search) ||
        order.customer_phone?.includes(search) ||
        order.id?.toLowerCase().includes(search) ||
        order.takeapp_order_number?.toString().includes(search) ||
        order.items_text?.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  }, [searchTerm, statusFilter, orders]);

  const openStatusDialog = (order) => {
    setSelectedOrder(order);
    setNewStatus(order.status || 'pending');
    setStatusNote('');
    setIsStatusDialogOpen(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedOrder || !newStatus) return;

    setIsUpdating(true);
    try {
      await orderTrackingAPI.updateStatus(selectedOrder.id, {
        status: newStatus,
        note: statusNote || null
      });
      
      toast.success(`Order status updated to ${newStatus}`);
      setIsStatusDialogOpen(false);
      
      // Refresh orders
      await fetchOrders();
    } catch (error) {
      toast.error('Failed to update order status');
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
    const Icon = statusConfig.icon;
    return (
      <Badge className={`${statusConfig.color} border flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {statusConfig.label}
      </Badge>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleExpand = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  // Calculate stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  return (
    <AdminLayout title="Order Management">
      <div className="space-y-6" data-testid="admin-orders">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-card border border-white/10 rounded-lg p-4">
            <p className="text-white/60 text-sm">Total Orders</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-card border border-yellow-500/20 rounded-lg p-4">
            <p className="text-yellow-400 text-sm">Pending</p>
            <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
          </div>
          <div className="bg-card border border-blue-500/20 rounded-lg p-4">
            <p className="text-blue-400 text-sm">Confirmed</p>
            <p className="text-2xl font-bold text-blue-400">{stats.confirmed}</p>
          </div>
          <div className="bg-card border border-green-500/20 rounded-lg p-4">
            <p className="text-green-400 text-sm">Completed</p>
            <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
          </div>
          <div className="bg-card border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400 text-sm">Cancelled</p>
            <p className="text-2xl font-bold text-red-400">{stats.cancelled}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder="Search by name, email, phone, or order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-black border-white/20 text-white"
              data-testid="order-search-input"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-black border-white/20 text-white" data-testid="order-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-card border-white/10">
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map(status => (
                <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={fetchOrders} 
            variant="outline" 
            className="border-gold-500 text-gold-500 hover:bg-gold-500 hover:text-black"
            data-testid="refresh-orders-btn"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 skeleton rounded-lg"></div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-card border border-white/10 rounded-lg p-12 text-center">
            <Package className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No orders found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div 
                key={order.id} 
                className="bg-card border border-white/10 rounded-lg overflow-hidden hover:border-gold-500/30 transition-colors"
                data-testid={`order-card-${order.id}`}
              >
                {/* Order Header */}
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => toggleExpand(order.id)}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-gold-500/10 rounded-lg">
                        <Package className="h-6 w-6 text-gold-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-heading font-semibold text-white">
                            #{order.takeapp_order_number || order.id.slice(0, 8)}
                          </span>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-white font-medium">{order.customer_name || 'Unknown'}</p>
                        <p className="text-white/40 text-sm">{formatDate(order.created_at)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-gold-500 font-bold text-xl">
                          Rs {(order.total_amount || 0).toLocaleString()}
                        </p>
                        <p className="text-white/40 text-sm">{order.items?.length || 0} items</p>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          openStatusDialog(order);
                        }}
                        className="bg-gold-500 hover:bg-gold-600 text-black"
                        data-testid={`update-status-btn-${order.id}`}
                      >
                        Update Status
                      </Button>
                      {expandedOrderId === order.id ? (
                        <ChevronUp className="h-5 w-5 text-white/40" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-white/40" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedOrderId === order.id && (
                  <div className="border-t border-white/10 p-4 bg-black/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Customer Info */}
                      <div className="space-y-3">
                        <h4 className="text-white font-semibold uppercase text-sm tracking-wider">Customer Details</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-white/80">
                            <User className="h-4 w-4 text-gold-500" />
                            {order.customer_name || 'Not provided'}
                          </div>
                          <div className="flex items-center gap-2 text-white/80">
                            <Mail className="h-4 w-4 text-gold-500" />
                            {order.customer_email || 'Not provided'}
                          </div>
                          <div className="flex items-center gap-2 text-white/80">
                            <Phone className="h-4 w-4 text-gold-500" />
                            {order.customer_phone || 'Not provided'}
                          </div>
                          <div className="flex items-center gap-2 text-white/80">
                            <Calendar className="h-4 w-4 text-gold-500" />
                            {formatDate(order.created_at)}
                          </div>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="space-y-3">
                        <h4 className="text-white font-semibold uppercase text-sm tracking-wider">Order Items</h4>
                        <div className="bg-black/50 rounded-lg p-3">
                          <p className="text-white/80">{order.items_text || 'No items'}</p>
                          {order.remark && (
                            <div className="mt-2 pt-2 border-t border-white/10">
                              <p className="text-white/40 text-sm">Note: {order.remark}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status History */}
                    {order.status_history && order.status_history.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-white font-semibold uppercase text-sm tracking-wider mb-3">Status History</h4>
                        <div className="space-y-2">
                          {order.status_history.map((history, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-sm">
                              <div className="w-2 h-2 rounded-full bg-gold-500"></div>
                              <span className="text-white/60">{formatDate(history.created_at)}</span>
                              <span className="text-white">
                                {history.old_status} → {history.new_status}
                              </span>
                              {history.note && (
                                <span className="text-white/40">({history.note})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Status Update Dialog */}
        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
          <DialogContent className="bg-card border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">Update Order Status</DialogTitle>
              <DialogDescription className="text-white/60">
                Order #{selectedOrder?.takeapp_order_number || selectedOrder?.id?.slice(0, 8)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-white">Current Status</Label>
                <div className="flex items-center gap-2">
                  {selectedOrder && getStatusBadge(selectedOrder.status)}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="bg-black border-white/20 text-white" data-testid="new-status-select">
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-white/10">
                    {STATUS_OPTIONS.map(status => {
                      const Icon = status.icon;
                      return (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {status.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Note (Optional)</Label>
                <Textarea
                  placeholder="Add a note about this status change..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="bg-black border-white/20 text-white min-h-[80px]"
                  data-testid="status-note-input"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsStatusDialogOpen(false)}
                className="border-white/20 text-white hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                onClick={handleStatusUpdate}
                disabled={isUpdating || newStatus === selectedOrder?.status}
                className="bg-gold-500 hover:bg-gold-600 text-black"
                data-testid="confirm-status-update-btn"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Status'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
