import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Star } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { reviewsAPI } from '@/lib/api';

const emptyReview = {
  reviewer_name: '',
  rating: 5,
  comment: '',
  review_date: ''
};

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [formData, setFormData] = useState(emptyReview);

  const fetchReviews = async () => {
    try {
      const res = await reviewsAPI.getAll();
      setReviews(res.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleOpenDialog = (review = null) => {
    if (review) {
      setEditingReview(review);
      setFormData({
        reviewer_name: review.reviewer_name,
        rating: review.rating,
        comment: review.comment,
        review_date: review.review_date?.split('T')[0] || ''
      });
    } else {
      setEditingReview(null);
      setFormData(emptyReview);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const data = {
        ...formData,
        review_date: formData.review_date ? new Date(formData.review_date).toISOString() : null
      };

      if (editingReview) {
        await reviewsAPI.update(editingReview.id, data);
        toast.success('Review updated!');
      } else {
        await reviewsAPI.create(data);
        toast.success('Review created!');
      }
      setIsDialogOpen(false);
      fetchReviews();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error saving review');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    
    try {
      await reviewsAPI.delete(id);
      toast.success('Review deleted!');
      fetchReviews();
    } catch (error) {
      toast.error('Error deleting review');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <AdminLayout title="Reviews">
      <div className="space-y-6" data-testid="admin-reviews">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-white/60">Manage customer reviews</p>
          <Button 
            onClick={() => handleOpenDialog()}
            className="bg-gold-500 hover:bg-gold-600 text-black"
            data-testid="add-review-btn"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Review
          </Button>
        </div>

        {/* Reviews Table */}
        <div className="bg-card border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full admin-table">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-white/80 font-heading uppercase text-sm">Reviewer</th>
                <th className="text-left px-6 py-4 text-white/80 font-heading uppercase text-sm">Rating</th>
                <th className="text-left px-6 py-4 text-white/80 font-heading uppercase text-sm">Comment</th>
                <th className="text-left px-6 py-4 text-white/80 font-heading uppercase text-sm">Date</th>
                <th className="text-right px-6 py-4 text-white/80 font-heading uppercase text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-white/40">Loading...</td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-white/40">No reviews found</td>
                </tr>
              ) : (
                reviews.map((review) => (
                  <tr key={review.id} className="border-b border-white/5" data-testid={`review-row-${review.id}`}>
                    <td className="px-6 py-4 text-white font-medium">{review.reviewer_name}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= review.rating ? 'text-gold-500 fill-gold-500' : 'text-white/20'
                            }`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white/60 max-w-xs truncate">{review.comment}</td>
                    <td className="px-6 py-4 text-white/60">{formatDate(review.review_date)}</td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(review)}
                        className="text-white/60 hover:text-gold-500"
                        data-testid={`edit-review-${review.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(review.id)}
                        className="text-white/60 hover:text-red-500"
                        data-testid={`delete-review-${review.id}`}
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

        {/* Review Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-card border-white/10 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl uppercase">
                {editingReview ? 'Edit Review' : 'Add Review'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Reviewer Name</Label>
                <Input
                  value={formData.reviewer_name}
                  onChange={(e) => setFormData({ ...formData, reviewer_name: e.target.value })}
                  className="bg-black border-white/20"
                  placeholder="John Doe"
                  required
                  data-testid="review-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Rating</Label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: star })}
                      className="focus:outline-none"
                      data-testid={`rating-star-${star}`}
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${
                          star <= formData.rating 
                            ? 'text-gold-500 fill-gold-500' 
                            : 'text-white/20 hover:text-gold-500/50'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Comment</Label>
                <Textarea
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  className="bg-black border-white/20"
                  placeholder="Great service..."
                  required
                  data-testid="review-comment-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Review Date (optional - defaults to today)</Label>
                <Input
                  type="date"
                  value={formData.review_date}
                  onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
                  className="bg-black border-white/20"
                  data-testid="review-date-input"
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
                  data-testid="save-review-btn"
                >
                  {editingReview ? 'Update' : 'Create'} Review
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
