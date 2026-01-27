import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, X, Upload, Image } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { productsAPI, categoriesAPI, uploadAPI } from '@/lib/api';

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
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef(null);

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
      setImagePreview(product.image_url);
    } else {
      setEditingProduct(null);
      setFormData(emptyProduct);
      setImagePreview('');
    }
    setNewVariation(emptyVariation);
    setIsDialogOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      const res = await uploadAPI.uploadImage(file);
      const imageUrl = uploadAPI.getImageUrl(res.data.url);
      setFormData({ ...formData, image_url: imageUrl });
      toast.success('Image uploaded!');
    } catch (error) {
      toast.error('Failed to upload image');
      setImagePreview('');
    } finally {
      setIsUploading(false);
    }
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
    
    if (!formData.image_url) {
      toast.error('Please upload an image');
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

  const getCategoryName = (categoryId) => {
    return categories.find(c => c.id === categoryId)?.name || categoryId;
  };

  return (
    <AdminLayout title="Products">
      <div className="space-y-4 lg:space-y-6" data-testid="admin-products">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-white/60 text-sm lg:text-base">Manage your product catalog</p>
          <Button 
            onClick={() => handleOpenDialog()}
            className="bg-gold-500 hover:bg-gold-600 text-black w-full sm:w-auto"
            data-testid="add-product-btn"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>

        {/* No Categories Warning */}
        {!isLoading && categories.length === 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-yellow-400 text-sm">
            Please create categories first before adding products. Go to Categories section.
          </div>
        )}

        {/* Products - Mobile Cards / Desktop Table */}
        <div className="lg:hidden space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-white/40">Loading...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 bg-card border border-white/10 rounded-lg">
              <Image className="h-12 w-12 mx-auto text-white/20 mb-4" />
              <p className="text-white/40">No products yet</p>
            </div>
          ) : (
            products.map((product) => (
              <div 
                key={product.id} 
                className="bg-card border border-white/10 rounded-lg p-4"
                data-testid={`product-card-${product.id}`}
              >
                <div className="flex items-start gap-3">
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-16 h-16 rounded object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">{product.name}</h3>
                    <p className="text-white/60 text-sm">{getCategoryName(product.category_id)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-white/40 text-xs">{product.variations?.length || 0} variations</span>
                      {product.is_sold_out ? (
                        <span className="text-red-400 text-xs">Sold Out</span>
                      ) : product.is_active ? (
                        <span className="text-green-400 text-xs">Active</span>
                      ) : (
                        <span className="text-yellow-400 text-xs">Inactive</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
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
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block bg-card border border-white/10 rounded-lg overflow-hidden">
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
                  <td colSpan={5} className="px-6 py-12 text-center text-white/40">No products yet</td>
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
          <DialogContent className="bg-card border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl uppercase">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Product Image</Label>
                <div 
                  className="border-2 border-dashed border-white/20 rounded-lg p-4 text-center cursor-pointer hover:border-gold-500/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-32 h-32 object-cover rounded-lg mx-auto"
                      />
                      <p className="text-white/40 text-xs mt-2">Click to change image</p>
                    </div>
                  ) : (
                    <div className="py-4">
                      <Upload className="h-8 w-8 mx-auto text-white/40 mb-2" />
                      <p className="text-white/60 text-sm">Click to upload image</p>
                      <p className="text-white/40 text-xs mt-1">PNG, JPG, WebP (max 5MB)</p>
                    </div>
                  )}
                  {isUploading && (
                    <div className="mt-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gold-500 mx-auto"></div>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageUpload}
                  className="hidden"
                  data-testid="product-image-input"
                />
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
                      {categories.length === 0 ? (
                        <SelectItem value="" disabled>No categories - create one first</SelectItem>
                      ) : (
                        categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description (HTML supported)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-black border-white/20 min-h-[100px] lg:min-h-[150px]"
                  placeholder="<p>Product description...</p><ul><li>Feature 1</li></ul>"
                  data-testid="product-description-input"
                />
              </div>

              {/* Variations */}
              <div className="space-y-3">
                <Label>Pricing Variations</Label>
                
                {/* Existing Variations */}
                {formData.variations.length > 0 && (
                  <div className="space-y-2">
                    {formData.variations.map((v) => (
                      <div key={v.id} className="flex items-center gap-2 lg:gap-4 bg-black p-2 lg:p-3 rounded-lg text-sm">
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

                {/* Add New Variation */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <Input
                    value={newVariation.name}
                    onChange={(e) => setNewVariation({ ...newVariation, name: e.target.value })}
                    placeholder="Plan name (e.g. 1 Month)"
                    className="bg-black border-white/20 col-span-2 lg:col-span-1"
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
                    className="bg-black border-white/20 hidden lg:block"
                    data-testid="variation-original-price-input"
                  />
                  <Button
                    type="button"
                    onClick={handleAddVariation}
                    variant="outline"
                    className="border-gold-500 text-gold-500 col-span-2 lg:col-span-1"
                    data-testid="add-variation-btn"
                  >
                    Add Variation
                  </Button>
                </div>
              </div>

              {/* Status Toggles */}
              <div className="flex items-center gap-6 lg:gap-8">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    data-testid="product-active-toggle"
                  />
                  <Label className="text-sm">Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_sold_out}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_sold_out: checked })}
                    data-testid="product-soldout-toggle"
                  />
                  <Label className="text-sm">Sold Out</Label>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gold-500 hover:bg-gold-600 text-black w-full sm:w-auto"
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
