import { useEffect, useState } from 'react';
import { Users, RefreshCw, Phone, Mail, ShoppingBag, DollarSign, Download } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import api from '@/lib/api';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleExportCSV = () => {
    const headers = ['Phone', 'Name', 'Email', 'Total Orders', 'Total Spent', 'Created At'];
    const rows = customers.map(c => [
      c.phone,
      c.name || '',
      c.email || '',
      c.total_orders || 0,
      c.total_spent || 0,
      c.created_at ? new Date(c.created_at).toLocaleDateString() : ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const totalSpent = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
  const totalOrders = customers.reduce((sum, c) => sum + (c.total_orders || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <div className="flex gap-2">
            <Button onClick={handleExportCSV} variant="outline" className="border-zinc-700 text-white">
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Users className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Customers</p>
                  <p className="text-white text-xl font-bold">{customers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <ShoppingBag className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Orders</p>
                  <p className="text-white text-xl font-bold">{totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Revenue</p>
                  <p className="text-white text-xl font-bold">Rs {totalSpent.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <DollarSign className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Avg Order Value</p>
                  <p className="text-white text-xl font-bold">
                    Rs {totalOrders > 0 ? Math.round(totalSpent / totalOrders).toLocaleString() : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customers Table */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">All Customers</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto" />
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No customers yet</p>
                <p className="text-sm mt-1">Click "Sync from Take.app" to import customer data</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left text-gray-400 text-sm py-3 px-2">Customer</th>
                      <th className="text-left text-gray-400 text-sm py-3 px-2">Contact</th>
                      <th className="text-center text-gray-400 text-sm py-3 px-2">Orders</th>
                      <th className="text-right text-gray-400 text-sm py-3 px-2">Total Spent</th>
                      <th className="text-right text-gray-400 text-sm py-3 px-2">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <tr key={customer.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="py-3 px-2">
                          <p className="text-white font-medium">{customer.name || 'Unknown'}</p>
                          {customer.source && (
                            <span className="text-xs text-gray-500">via {customer.source}</span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-gray-400 text-sm flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {customer.phone}
                            </span>
                            {customer.email && (
                              <span className="text-gray-400 text-sm flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {customer.email}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="text-white font-medium">{customer.total_orders || 0}</span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className="text-amber-500 font-medium">
                            Rs {(customer.total_spent || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right text-gray-400 text-sm">
                          {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
