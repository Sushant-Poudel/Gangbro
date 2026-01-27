import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, ChevronDown } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { productsAPI, categoriesAPI } from '@/lib/api';

const emptyProduct = {
  name: '',
  description: '',
  image_url: '',
  category_id: '',
  variations: [],
  is_active: true,
  is_sold_out: false
};

const emptyVariation = {
  id: '',
  name: '',
  price: '',
  original_price: ''
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(emptyProduct);
  const [newVariation, setNewVariation] = useState(emptyVariation);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        productsAPI.getAll(null, false),
        categoriesAPI.getAll()
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description,
        image_url: product.image_url,
        category_id: product.category_id,
        variations: product.variations || [],
        is_active: product.is_active,
        is_sold_out: product.is_sold_out
      });
    } else {
      setEditingProduct(null);
      setFormData(emptyProduct);
    }
    setNewVariation(emptyVariation);
    setIsDialogOpen(true);
  };

  const handleAddVariation = () => {
    if (!newVariation.name || !newVariation.price) {
      toast.error('Variation name and price are required');
      return;
    }
    const variation = {
      ...newVariation,
      id: `var-${Date.now()}`,
      price: parseFloat(newVariation.price),
      original_price: newVariation.original_price ? parseFloat(newVariation.original_price) : null
    };
    setFormData({
      ...formData,
      variations: [...formData.variations, variation]
    });
    setNewVariation(emptyVariation);
  };

  const handleRemoveVariation = (varId) => {
    setFormData({
      ...formData,
      variations: formData.variations.filter(v => v.id !== varId)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.variations.length === 0) {
      toast.error('Add at least one variation');
      return;
    }

    try {
      if (editingProduct) {
        await productsAPI.update(editingProduct.id, formData);
        toast.success('Product updated!');
      } else {
        await productsAPI.create(formData);
        toast.success('Product created!');
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error saving product');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await productsAPI.delete(id);
      toast.success('Product deleted!');
      fetchData();
    } catch (error) {
      toast.error('Error deleting product');
    }
  };

  const getCategoryName = (categoryId) => {
    return categories.find(c => c.id === categoryId)?.name || categoryId;
  };

  return (
    <AdminLayout title="Products">
      <div className="space-y-6" data-testid="admin-products">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-white/60">Manage your product catalog</p>
          <Button 
            onClick={() => handleOpenDialog()}
            className="bg-gold-500 hover:bg-gold-600 text-black"
            data-testid="add-product-btn"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>

        {/* Products Table */}
        <div className="bg-card border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full admin-table">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-white/80 font-heading uppercase text-sm">Product</th>
                <th className="text-left px-6 py-4 text-white/80 font-heading uppercase text-sm">Category</th>
                <th className="text-left px-6 py-4 text-white/80 font-heading uppercase text-sm">Variations</th>
                <th className="text-left px-6 py-4 text-white/80 font-heading uppercase text-sm">Status</th>
                <th className="text-right px-6 py-4 text-white/80 font-heading uppercase text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-white/40">Loading...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-white/40">No products found</td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="border-b border-white/5" data-testid={`product-row-${product.id}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <span className="text-white font-medium">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white/60">{getCategoryName(product.category_id)}</td>
                    <td className="px-6 py-4 text-white/60">{product.variations?.length || 0}</td>
                    <td className="px-6 py-4">
                      {product.is_sold_out ? (
                        <span className="text-red-400 text-sm">Sold Out</span>
                      ) : product.is_active ? (
                        <span className="text-green-400 text-sm">Active</span>
                      ) : (
                        <span className="text-yellow-400 text-sm">Inactive</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(product)}
                        className="text-white/60 hover:text-gold-500"
                        data-testid={`edit-product-${product.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(product.id)}
                        className="text-white/60 hover:text-red-500"
                        data-testid={`delete-product-${product.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Product Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-card border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl uppercase">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Product Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-black border-white/20"
                    required
                    data-testid="product-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select 
                    value={formData.category_id} 
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger className="bg-black border-white/20" data-testid="product-category-select">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Image URL</Label>
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="bg-black border-white/20"
                  placeholder="https://..."
                  required
                  data-testid="product-image-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Description (HTML supported)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-black border-white/20 min-h-[150px]"
                  placeholder="<p>Product description...</p>"
                  data-testid="product-description-input"
                />
              </div>

              {/* Variations */}
              <div className="space-y-4">
                <Label>Variations</Label>
                
                {/* Existing Variations */}
                {formData.variations.length > 0 && (
                  <div className="space-y-2">
                    {formData.variations.map((v) => (
                      <div key={v.id} className="flex items-center gap-4 bg-black p-3 rounded-lg">
                        <span className="flex-1 text-white">{v.name}</span>
                        <span className="text-gold-500">Rs {v.price}</span>
                        {v.original_price && (
                          <span className="text-white/40 line-through">Rs {v.original_price}</span>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveVariation(v.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Variation */}
                <div className="grid grid-cols-4 gap-2">
                  <Input
                    value={newVariation.name}
                    onChange={(e) => setNewVariation({ ...newVariation, name: e.target.value })}
                    placeholder="Plan name"
                    className="bg-black border-white/20"
                    data-testid="variation-name-input"
                  />
                  <Input
                    type="number"
                    value={newVariation.price}
                    onChange={(e) => setNewVariation({ ...newVariation, price: e.target.value })}
                    placeholder="Price"
                    className="bg-black border-white/20"
                    data-testid="variation-price-input"
                  />
                  <Input
                    type="number"
                    value={newVariation.original_price}
                    onChange={(e) => setNewVariation({ ...newVariation, original_price: e.target.value })}
                    placeholder="Original (optional)"
                    className="bg-black border-white/20"
                    data-testid="variation-original-price-input"
                  />
                  <Button
                    type="button"
                    onClick={handleAddVariation}
                    variant="outline"
                    className="border-gold-500 text-gold-500"
                    data-testid="add-variation-btn"
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Status Toggles */}
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    data-testid="product-active-toggle"
                  />
                  <Label>Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_sold_out}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_sold_out: checked })}
                    data-testid="product-soldout-toggle"
                  />
                  <Label>Sold Out</Label>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gold-500 hover:bg-gold-600 text-black"
                  data-testid="save-product-btn"
                >
                  {editingProduct ? 'Update' : 'Create'} Product
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
