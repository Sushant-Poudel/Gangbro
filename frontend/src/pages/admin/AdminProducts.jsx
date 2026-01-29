import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Link, Image, ChevronUp, ChevronDown } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { productsAPI, categoriesAPI } from '@/lib/api';

const AVAILABLE_TAGS = ['Popular', 'Sale', 'New', 'Limited', 'Hot', 'Best Seller'];

const emptyProduct = {
  name: '',
  description: '',
  image_url: '',
  category_id: '',
  variations: [],
  tags: [],
  custom_fields: [],
  sort_order: 0,
  is_active: true,
  is_sold_out: false
};

const emptyVariation = {
  id: '',
  name: '',
  price: '',
  original_price: ''
};

const emptyCustomField = {
  id: '',
  label: '',
  placeholder: '',
  required: false
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(emptyProduct);
  const [newVariation, setNewVariation] = useState(emptyVariation);
  const [newCustomField, setNewCustomField] = useState(emptyCustomField);

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
        tags: product.tags || [],
        custom_fields: product.custom_fields || [],
        sort_order: product.sort_order || 0,
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

  const handleToggleTag = (tag) => {
    if (formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
    } else {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
    }
  };

  const handleAddCustomField = () => {
    if (!newCustomField.label) {
      toast.error('Field label is required');
      return;
    }
    const field = {
      ...newCustomField,
      id: `field-${Date.now()}`
    };
    setFormData({
      ...formData,
      custom_fields: [...formData.custom_fields, field]
    });
    setNewCustomField(emptyCustomField);
  };

  const handleRemoveCustomField = (fieldId) => {
    setFormData({
      ...formData,
      custom_fields: formData.custom_fields.filter(f => f.id !== fieldId)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.image_url) {
      toast.error('Please provide an image URL');
      return;
    }
    
    if (!formData.category_id) {
      toast.error('Please select a category');
      return;
    }
    
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

  const handleMoveProduct = async (index, direction) => {
    const newProducts = [...products];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= products.length) return;
    
    [newProducts[index], newProducts[newIndex]] = [newProducts[newIndex], newProducts[index]];
    setProducts(newProducts);
    
    // Update sort orders
    try {
      const productIds = newProducts.map(p => p.id);
      await productsAPI.reorder(productIds);
    } catch (error) {
      toast.error('Failed to reorder');
      fetchData();
    }
  };

  const getCategoryName = (categoryId) => {
    return categories.find(c => c.id === categoryId)?.name || categoryId;
  };

  return (
    <AdminLayout title="Products">
      <div className="space-y-4 lg:space-y-6" data-testid="admin-products">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-white/60 text-sm lg:text-base">Manage your product catalog. Drag to reorder.</p>
          <Button 
            onClick={() => handleOpenDialog()}
            className="bg-gold-500 hover:bg-gold-600 text-black w-full sm:w-auto"
            data-testid="add-product-btn"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>

        {!isLoading && categories.length === 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-yellow-400 text-sm">
            Please create categories first before adding products.
          </div>
        )}

        {/* Products List */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-white/40">Loading...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 bg-card border border-white/10 rounded-lg">
              <Image className="h-12 w-12 mx-auto text-white/20 mb-4" />
              <p className="text-white/40">No products yet</p>
            </div>
          ) : (
            products.map((product, index) => (
              <div 
                key={product.id} 
                className="bg-card border border-white/10 rounded-lg p-4 flex items-center gap-4"
                data-testid={`product-row-${product.id}`}
              >
                {/* Ordering Controls */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleMoveProduct(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-white/40 hover:text-gold-500 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleMoveProduct(index, 'down')}
                    disabled={index === products.length - 1}
                    className="p-1 text-white/40 hover:text-gold-500 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-14 h-14 rounded object-cover flex-shrink-0"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-white font-medium truncate">{product.name}</h3>
                    {product.tags?.map(tag => (
                      <Badge key={tag} variant="outline" className="text-[10px] border-gold-500/50 text-gold-500">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm">
                    <span className="text-white/60">{getCategoryName(product.category_id)}</span>
                    <span className="text-white/40">•</span>
                    <span className="text-white/40">{product.variations?.length || 0} variations</span>
                    {product.is_sold_out ? (
                      <span className="text-red-400 text-xs">Sold Out</span>
                    ) : product.is_active ? (
                      <span className="text-green-400 text-xs">Active</span>
                    ) : (
                      <span className="text-yellow-400 text-xs">Inactive</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenDialog(product)}
                    className="text-white/60 hover:text-gold-500 p-2"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(product.id)}
                    className="text-white/60 hover:text-red-500 p-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Product Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-card border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl uppercase">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
              {/* Image URL Input */}
              <div className="space-y-2">
                <Label>Product Image URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="bg-black border-white/20 flex-1"
                    placeholder="https://example.com/image.png"
                  />
                </div>
                {formData.image_url && (
                  <div className="mt-2 flex items-center gap-3">
                    <img 
                      src={formData.image_url} 
                      alt="Preview" 
                      className="w-20 h-20 object-cover rounded-lg"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                    <span className="text-white/40 text-xs">Image preview</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Product Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-black border-white/20"
                    placeholder="e.g. Netflix Premium"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select 
                    value={formData.category_id || undefined} 
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger className="bg-black border-white/20">
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

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_TAGS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        formData.tags.includes(tag)
                          ? 'bg-gold-500 text-black'
                          : 'bg-white/10 text-white/60 hover:bg-white/20'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description (HTML supported)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-black border-white/20 min-h-[100px]"
                  placeholder="<p>Product description...</p>"
                />
              </div>

              {/* Variations */}
              <div className="space-y-3">
                <Label>Pricing Variations</Label>
                
                {formData.variations.length > 0 && (
                  <div className="space-y-2">
                    {formData.variations.map((v) => (
                      <div key={v.id} className="flex items-center gap-2 bg-black p-2 rounded-lg text-sm">
                        <span className="flex-1 text-white truncate">{v.name}</span>
                        <span className="text-gold-500">Rs {v.price}</span>
                        {v.original_price && (
                          <span className="text-white/40 line-through hidden sm:inline">Rs {v.original_price}</span>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveVariation(v.id)}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <Input
                    value={newVariation.name}
                    onChange={(e) => setNewVariation({ ...newVariation, name: e.target.value })}
                    placeholder="Plan name"
                    className="bg-black border-white/20 col-span-2 lg:col-span-1"
                  />
                  <Input
                    type="number"
                    value={newVariation.price}
                    onChange={(e) => setNewVariation({ ...newVariation, price: e.target.value })}
                    placeholder="Price"
                    className="bg-black border-white/20"
                  />
                  <Input
                    type="number"
                    value={newVariation.original_price}
                    onChange={(e) => setNewVariation({ ...newVariation, original_price: e.target.value })}
                    placeholder="Original"
                    className="bg-black border-white/20 hidden lg:block"
                  />
                  <Button
                    type="button"
                    onClick={handleAddVariation}
                    variant="outline"
                    className="border-gold-500 text-gold-500 col-span-2 lg:col-span-1"
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Status Toggles */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label className="text-sm">Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_sold_out}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_sold_out: checked })}
                  />
                  <Label className="text-sm">Sold Out</Label>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button type="submit" className="bg-gold-500 hover:bg-gold-600 text-black w-full sm:w-auto">
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
