import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import HomePage from "@/pages/HomePage";
import ProductPage from "@/pages/ProductPage";
import AboutPage from "@/pages/AboutPage";
import FAQPage from "@/pages/FAQPage";
import TermsPage from "@/pages/TermsPage";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminCategories from "@/pages/admin/AdminCategories";
import AdminReviews from "@/pages/admin/AdminReviews";
import AdminFAQs from "@/pages/admin/AdminFAQs";
import AdminPages from "@/pages/admin/AdminPages";
import AdminSocialLinks from "@/pages/admin/AdminSocialLinks";
import AdminTakeApp from "@/pages/admin/AdminTakeApp";
import ProtectedRoute from "@/components/ProtectedRoute";
import "@/App.css";

function App() {
  return (
    <div className="App min-h-screen bg-black">
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/product/:productId" element={<ProductPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/terms" element={<TermsPage />} />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/products" element={<ProtectedRoute><AdminProducts /></ProtectedRoute>} />
          <Route path="/admin/categories" element={<ProtectedRoute><AdminCategories /></ProtectedRoute>} />
          <Route path="/admin/reviews" element={<ProtectedRoute><AdminReviews /></ProtectedRoute>} />
          <Route path="/admin/faqs" element={<ProtectedRoute><AdminFAQs /></ProtectedRoute>} />
          <Route path="/admin/pages" element={<ProtectedRoute><AdminPages /></ProtectedRoute>} />
          <Route path="/admin/social-links" element={<ProtectedRoute><AdminSocialLinks /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
