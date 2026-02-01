import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import HomePage from "@/pages/HomePage";
import ProductPage from "@/pages/ProductPage";
import AboutPage from "@/pages/AboutPage";
import FAQPage from "@/pages/FAQPage";
import TermsPage from "@/pages/TermsPage";
import BlogPage from "@/pages/BlogPage";
import BlogPostPage from "@/pages/BlogPostPage";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminCategories from "@/pages/admin/AdminCategories";
import AdminReviews from "@/pages/admin/AdminReviews";
import AdminFAQs from "@/pages/admin/AdminFAQs";
import AdminPages from "@/pages/admin/AdminPages";
import AdminSocialLinks from "@/pages/admin/AdminSocialLinks";
import AdminTakeApp from "@/pages/admin/AdminTakeApp";
import AdminPaymentMethods from "@/pages/admin/AdminPaymentMethods";
import AdminNotificationBar from "@/pages/admin/AdminNotificationBar";
import AdminBlog from "@/pages/admin/AdminBlog";
import AdminPromoCodes from "@/pages/admin/AdminPromoCodes";
import AdminPricingSettings from "@/pages/admin/AdminPricingSettings";
import AdminTrustpilot from "@/pages/admin/AdminTrustpilot";
import ProtectedRoute from "@/components/ProtectedRoute";
import "@/App.css";

function App() {
  return (
    <div className="App min-h-screen bg-black">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/product/:productSlug" element={<ProductPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/products" element={<ProtectedRoute><AdminProducts /></ProtectedRoute>} />
          <Route path="/admin/categories" element={<ProtectedRoute><AdminCategories /></ProtectedRoute>} />
          <Route path="/admin/reviews" element={<ProtectedRoute><AdminReviews /></ProtectedRoute>} />
          <Route path="/admin/faqs" element={<ProtectedRoute><AdminFAQs /></ProtectedRoute>} />
          <Route path="/admin/pages" element={<ProtectedRoute><AdminPages /></ProtectedRoute>} />
          <Route path="/admin/social-links" element={<ProtectedRoute><AdminSocialLinks /></ProtectedRoute>} />
          <Route path="/admin/takeapp" element={<ProtectedRoute><AdminTakeApp /></ProtectedRoute>} />
          <Route path="/admin/payment-methods" element={<ProtectedRoute><AdminPaymentMethods /></ProtectedRoute>} />
          <Route path="/admin/notification-bar" element={<ProtectedRoute><AdminNotificationBar /></ProtectedRoute>} />
          <Route path="/admin/blog" element={<ProtectedRoute><AdminBlog /></ProtectedRoute>} />
          <Route path="/admin/promo-codes" element={<ProtectedRoute><AdminPromoCodes /></ProtectedRoute>} />
          <Route path="/admin/pricing" element={<ProtectedRoute><AdminPricingSettings /></ProtectedRoute>} />
          <Route path="/admin/trustpilot" element={<ProtectedRoute><AdminTrustpilot /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
