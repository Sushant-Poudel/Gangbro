import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Heart, User, LogOut, ShoppingBag, Calendar, DollarSign, Edit, Save, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CustomerAccountPage() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('customer_token');
    const customerInfo = localStorage.getItem('customer_info');

    if (!token || !customerInfo) {
      navigate('/');
      toast.error('Please login to access your account');
      return;
    }

    try {
      setCustomer(JSON.parse(customerInfo));
      fetchData(token);
    } catch (e) {
      navigate('/');
    }
  }, [navigate]);

  const fetchData = async (token) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [ordersRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/customer/orders`, { headers }),
        axios.get(`${API_URL}/customer/stats`, { headers })
      ]);

      setOrders(ordersRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Failed to load account data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    setEditForm({
      name: customer.name || '',
      phone: customer.phone || ''
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({ name: '', phone: '' });
  };

  const handleSaveProfile = async () => {
    if (!editForm.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('customer_token');
      const response = await axios.put(
        `${API_URL}/auth/customer/profile`,
        null,
        {
          params: {
            name: editForm.name.trim(),
            phone: editForm.phone.trim() || null
          },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Update local state
      setCustomer(response.data);
      localStorage.setItem('customer_info', JSON.stringify(response.data));
      
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_info');
    toast.success('Logged out successfully');
    navigate('/');
  };

  if (loading || !customer) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 pt-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl lg:text-4xl font-bold text-white uppercase">
              My Account
            </h1>
            <p className="text-white/60 mt-2">Welcome back, {customer.name}!</p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="border-white/20 text-white hover:bg-white/5"
            data-testid="logout-button"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-card border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm">Total Orders</p>
                    <p className="text-3xl font-bold text-gold-500">{stats.total_orders}</p>
                  </div>
                  <ShoppingBag className="h-10 w-10 text-gold-500/40" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm">Total Spent</p>
                    <p className="text-3xl font-bold text-gold-500">Rs {stats.total_spent.toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-10 w-10 text-gold-500/40" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm">Wishlist</p>
                    <p className="text-3xl font-bold text-gold-500">{stats.wishlist_items}</p>
                  </div>
                  <Heart className="h-10 w-10 text-gold-500/40" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm">Member Since</p>
                    <p className="text-lg font-bold text-gold-500">{stats.member_since}</p>
                  </div>
                  <Calendar className="h-10 w-10 text-gold-500/40" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="bg-card border border-white/10">
            <TabsTrigger value="orders" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
              <Package className="mr-2 h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
              <User className="mr-2 h-4 w-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            {orders.length === 0 ? (
              <Card className="bg-card border-white/10">
                <CardContent className="p-12 text-center">
                  <Package className="h-16 w-16 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60">No orders yet</p>
                  <Button 
                    onClick={() => navigate('/')} 
                    className="mt-4 bg-gold-500 hover:bg-gold-600 text-black"
                  >
                    Start Shopping
                  </Button>
                </CardContent>
              </Card>
            ) : (
              orders.map((order) => (
                <Card key={order.id} className="bg-card border-white/10 hover:border-gold-500/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white">
                          Order #{order.takeapp_order_number || order.id.slice(0, 8)}
                        </CardTitle>
                        <CardDescription className="text-white/60">
                          {new Date(order.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gold-500">
                          Rs {order.total_amount.toLocaleString()}
                        </p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2 ${
                          order.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                          order.status === 'processing' ? 'bg-blue-500/20 text-blue-500' :
                          order.status === 'cancelled' ? 'bg-red-500/20 text-red-500' :
                          'bg-yellow-500/20 text-yellow-500'
                        }`}>
                          {order.status?.toUpperCase() || 'PENDING'}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/80">{order.items_text}</p>
                    {order.payment_url && order.status === 'pending' && (
                      <Button 
                        onClick={() => window.open(order.payment_url, '_blank')}
                        className="mt-4 bg-gold-500 hover:bg-gold-600 text-black"
                      >
                        Complete Payment
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="bg-card border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Profile Information</CardTitle>
                    <CardDescription className="text-white/60">
                      {isEditing ? 'Update your account details' : 'Your account details'}
                    </CardDescription>
                  </div>
                  {!isEditing && (
                    <Button
                      onClick={handleEditProfile}
                      variant="outline"
                      className="border-gold-500 text-gold-500 hover:bg-gold-500 hover:text-black"
                      data-testid="edit-profile-button"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  /* Edit Mode */
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="edit-name" className="text-white">Name *</Label>
                      <Input
                        id="edit-name"
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="bg-black border-white/20 text-white"
                        placeholder="Your name"
                        data-testid="edit-name-input"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-phone" className="text-white">Phone (Optional)</Label>
                      <Input
                        id="edit-phone"
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="bg-black border-white/20 text-white"
                        placeholder="+977 9800000000"
                        data-testid="edit-phone-input"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/60">Email (Cannot be changed)</Label>
                      <Input
                        type="email"
                        value={customer.email}
                        disabled
                        className="bg-black/50 border-white/10 text-white/60 cursor-not-allowed"
                      />
                      <p className="text-xs text-white/40">
                        Email cannot be changed for security reasons
                      </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="flex-1 bg-gold-500 hover:bg-gold-600 text-black"
                        data-testid="save-profile-button"
                      >
                        {saving ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleCancelEdit}
                        disabled={saving}
                        variant="outline"
                        className="flex-1 border-white/20 text-white hover:bg-white/5"
                        data-testid="cancel-edit-button"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  /* View Mode */
                  <>
                    <div>
                      <label className="text-white/60 text-sm">Name</label>
                      <p className="text-white text-lg">{customer.name}</p>
                    </div>
                    <div>
                      <label className="text-white/60 text-sm">Email</label>
                      <p className="text-white text-lg">{customer.email}</p>
                    </div>
                    <div>
                      <label className="text-white/60 text-sm">Phone</label>
                      <p className="text-white text-lg">{customer.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-white/60 text-sm">Member Since</label>
                      <p className="text-white text-lg">
                        {new Date(customer.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}
