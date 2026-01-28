import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { faqsAPI } from '@/lib/api';

const emptyFaq = {
  question: '',
  answer: '',
  sort_order: 0
};

export default function AdminFAQs() {
  const [faqs, setFaqs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [formData, setFormData] = useState(emptyFaq);

  const fetchFaqs = async () => {
    try {
      const res = await faqsAPI.getAll();
      setFaqs(res.data);
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      toast.error('Failed to load FAQs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const handleOpenDialog = (faq = null) => {
    if (faq) {
      setEditingFaq(faq);
      setFormData({
        question: faq.question,
        answer: faq.answer,
        sort_order: faq.sort_order || 0
      });
    } else {
      setEditingFaq(null);
      setFormData(emptyFaq);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error('Question and answer are required');
      return;
    }

    try {
      if (editingFaq) {
        await faqsAPI.update(editingFaq.id, formData);
        toast.success('FAQ updated!');
      } else {
        await faqsAPI.create(formData);
        toast.success('FAQ created!');
      }
      setIsDialogOpen(false);
      fetchFaqs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error saving FAQ');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return;
    
    try {
      await faqsAPI.delete(id);
      toast.success('FAQ deleted!');
      fetchFaqs();
    } catch (error) {
      toast.error('Error deleting FAQ');
    }
  };

  const handleMoveFaq = async (index, direction) => {
    const newFaqs = [...faqs];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= faqs.length) return;
    
    [newFaqs[index], newFaqs[newIndex]] = [newFaqs[newIndex], newFaqs[index]];
    setFaqs(newFaqs);
    
    try {
      const faqIds = newFaqs.map(f => f.id);
      await faqsAPI.reorder(faqIds);
    } catch (error) {
      toast.error('Failed to reorder FAQs');
      fetchFaqs();
    }
  };

  return (
    <AdminLayout title="FAQs">
      <div className="space-y-4 lg:space-y-6" data-testid="admin-faqs">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-white/60 text-sm lg:text-base">Manage frequently asked questions displayed on your site.</p>
          <Button 
            onClick={() => handleOpenDialog()}
            className="bg-gold-500 hover:bg-gold-600 text-black w-full sm:w-auto"
            data-testid="add-faq-btn"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add FAQ
          </Button>
        </div>

        {/* FAQs List */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-white/40">Loading...</div>
          ) : faqs.length === 0 ? (
            <div className="text-center py-12 bg-card border border-white/10 rounded-lg">
              <p className="text-white/40">No FAQs yet. Add your first FAQ!</p>
            </div>
          ) : (
            faqs.map((faq, index) => (
              <div 
                key={faq.id} 
                className="bg-card border border-white/10 rounded-lg p-4 flex items-start gap-4"
                data-testid={`faq-row-${faq.id}`}
              >
                {/* Ordering Controls */}
                <div className="flex flex-col gap-1 pt-1">
                  <button
                    onClick={() => handleMoveFaq(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-white/40 hover:text-gold-500 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleMoveFaq(index, 'down')}
                    disabled={index === faqs.length - 1}
                    className="p-1 text-white/40 hover:text-gold-500 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium mb-1">{faq.question}</h3>
                  <p className="text-white/60 text-sm line-clamp-2">{faq.answer}</p>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenDialog(faq)}
                    className="text-white/60 hover:text-gold-500 p-2"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(faq.id)}
                    className="text-white/60 hover:text-red-500 p-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* FAQ Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-card border-white/10 text-white max-w-lg mx-4">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl uppercase">
                {editingFaq ? 'Edit FAQ' : 'Add FAQ'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Question</Label>
                <Input
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="bg-black border-white/20"
                  placeholder="e.g. How do I place an order?"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Answer</Label>
                <Textarea
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  className="bg-black border-white/20 min-h-[120px]"
                  placeholder="Provide a helpful answer..."
                  required
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button type="submit" className="bg-gold-500 hover:bg-gold-600 text-black w-full sm:w-auto">
                  {editingFaq ? 'Update' : 'Create'} FAQ
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
