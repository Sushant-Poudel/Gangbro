import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { socialLinksAPI } from '@/lib/api';

const platformOptions = [
  { value: 'facebook', label: 'Facebook', icon: 'facebook' },
  { value: 'instagram', label: 'Instagram', icon: 'instagram' },
  { value: 'tiktok', label: 'TikTok', icon: 'tiktok' },
  { value: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp' },
  { value: 'youtube', label: 'YouTube', icon: 'youtube' },
  { value: 'twitter', label: 'Twitter/X', icon: 'twitter' },
  { value: 'telegram', label: 'Telegram', icon: 'telegram' },
  { value: 'discord', label: 'Discord', icon: 'discord' },
];

const emptyLink = {
  platform: '',
  url: '',
  icon: ''
};

export default function AdminSocialLinks() {
  const [links, setLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [formData, setFormData] = useState(emptyLink);

  const fetchLinks = async () => {
    try {
      const res = await socialLinksAPI.getAll();
      setLinks(res.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleOpenDialog = (link = null) => {
    if (link) {
      setEditingLink(link);
      setFormData({
        platform: link.platform,
        url: link.url,
        icon: link.icon
      });
    } else {
      setEditingLink(null);
      setFormData(emptyLink);
    }
    setIsDialogOpen(true);
  };

  const handlePlatformChange = (value) => {
    const platform = platformOptions.find(p => p.value === value);
    setFormData({
      ...formData,
      platform: platform?.label || value,
      icon: platform?.icon || value.toLowerCase()
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingLink) {
        await socialLinksAPI.update(editingLink.id, formData);
        toast.success('Social link updated!');
      } else {
        await socialLinksAPI.create(formData);
        toast.success('Social link created!');
      }
      setIsDialogOpen(false);
      fetchLinks();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error saving social link');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this social link?')) return;
    
    try {
      await socialLinksAPI.delete(id);
      toast.success('Social link deleted!');
      fetchLinks();
    } catch (error) {
      toast.error('Error deleting social link');
    }
  };

  return (
    <AdminLayout title="Social Links">
      <div className="space-y-6" data-testid="admin-social-links">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-white/60">Manage your social media links displayed in the footer</p>
          <Button 
            onClick={() => handleOpenDialog()}
            className="bg-gold-500 hover:bg-gold-600 text-black"
            data-testid="add-social-link-btn"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Social Link
          </Button>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="h-24 skeleton rounded-lg"></div>
            ))
          ) : links.length === 0 ? (
            <div className="col-span-full text-center py-12 text-white/40">
              No social links added yet
            </div>
          ) : (
            links.map((link) => (
              <div
                key={link.id}
                className="bg-card border border-white/10 rounded-lg p-4 hover:border-gold-500/30 transition-all"
                data-testid={`social-link-card-${link.id}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-semibold text-white uppercase">
                    {link.platform}
                  </h3>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(link)}
                      className="text-white/60 hover:text-gold-500"
                      data-testid={`edit-social-${link.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(link.id)}
                      className="text-white/60 hover:text-red-500"
                      data-testid={`delete-social-${link.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-gold-500 text-sm flex items-center gap-2 truncate"
                >
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{link.url}</span>
                </a>
              </div>
            ))
          )}
        </div>

        {/* Social Link Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-card border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl uppercase">
                {editingLink ? 'Edit Social Link' : 'Add Social Link'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select 
                  value={platformOptions.find(p => p.label === formData.platform)?.value || ''}
                  onValueChange={handlePlatformChange}
                >
                  <SelectTrigger className="bg-black border-white/20" data-testid="social-platform-select">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {platformOptions.map((platform) => (
                      <SelectItem key={platform.value} value={platform.value}>
                        {platform.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="bg-black border-white/20"
                  placeholder="https://..."
                  required
                  data-testid="social-url-input"
                />
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
                  data-testid="save-social-link-btn"
                >
                  {editingLink ? 'Update' : 'Create'} Link
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
