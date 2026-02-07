import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { WishlistProvider } from "@/components/Wishlist";
import { CartProvider } from "@/components/Cart";
import { LanguageProvider } from "@/components/Language";
import { CustomerProvider } from "@/components/CustomerAccount";
import HomePage from "@/pages/HomePage";
import ProductPage from "@/pages/ProductPage";
import CheckoutPage from "@/pages/CheckoutPage";
import PaymentPage from "@/pages/PaymentPage";
import AboutPage from "@/pages/AboutPage";
import FAQPage from "@/pages/FAQPage";
import TermsPage from "@/pages/TermsPage";
import BlogPage from "@/pages/BlogPage";
import BlogPostPage from "@/pages/BlogPostPage";
import CustomerAccountPage from "@/pages/CustomerAccountPage";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminCategories from "@/pages/admin/AdminCategories";
import AdminReviews from "@/pages/admin/AdminReviews";
import AdminFAQs from "@/pages/admin/AdminFAQs";
import AdminPages from "@/pages/admin/AdminPages";
import AdminSocialLinks from "@/pages/admin/AdminSocialLinks";
import AdminPaymentMethods from "@/pages/admin/AdminPaymentMethods";
import AdminNotificationBar from "@/pages/admin/AdminNotificationBar";
import AdminBlog from "@/pages/admin/AdminBlog";
import AdminPromoCodes from "@/pages/admin/AdminPromoCodes";
import AdminPricingSettings from "@/pages/admin/AdminPricingSettings";
import AdminTrustpilot from "@/pages/admin/AdminTrustpilot";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminCustomers from "@/pages/admin/AdminCustomers";
import AdminOrders from "@/pages/admin/AdminOrders";
import ProtectedRoute from "@/components/ProtectedRoute";
import "@/App.css";

function App() {
  return (
    <LanguageProvider>
      <CustomerProvider>
        <CartProvider>
          <WishlistProvider>
            <div className="App min-h-screen bg-black">
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/product/:productSlug" element={<ProductPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/payment/:orderId" element={<PaymentPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/faq" element={<FAQPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/blog" element={<BlogPage />} />
                  <Route path="/blog/:slug" element={<BlogPostPage />} />
                  <Route path="/account" element={<CustomerAccountPage />} />

                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/admin/analytics" element={<ProtectedRoute><AdminAnalytics /></ProtectedRoute>} />
                  <Route path="/admin/products" element={<ProtectedRoute><AdminProducts /></ProtectedRoute>} />
                  <Route path="/admin/categories" element={<ProtectedRoute><AdminCategories /></ProtectedRoute>} />
                  <Route path="/admin/reviews" element={<ProtectedRoute><AdminReviews /></ProtectedRoute>} />
                  <Route path="/admin/faqs" element={<ProtectedRoute><AdminFAQs /></ProtectedRoute>} />
                  <Route path="/admin/pages" element={<ProtectedRoute><AdminPages /></ProtectedRoute>} />
                  <Route path="/admin/social-links" element={<ProtectedRoute><AdminSocialLinks /></ProtectedRoute>} />
                  <Route path="/admin/payment-methods" element={<ProtectedRoute><AdminPaymentMethods /></ProtectedRoute>} />
                  <Route path="/admin/notification-bar" element={<ProtectedRoute><AdminNotificationBar /></ProtectedRoute>} />
                  <Route path="/admin/blog" element={<ProtectedRoute><AdminBlog /></ProtectedRoute>} />
                  <Route path="/admin/promo-codes" element={<ProtectedRoute><AdminPromoCodes /></ProtectedRoute>} />
                  <Route path="/admin/pricing" element={<ProtectedRoute><AdminPricingSettings /></ProtectedRoute>} />
                  <Route path="/admin/trustpilot" element={<ProtectedRoute><AdminTrustpilot /></ProtectedRoute>} />
                  <Route path="/admin/customers" element={<ProtectedRoute><AdminCustomers /></ProtectedRoute>} />
                  <Route path="/admin/orders" element={<ProtectedRoute><AdminOrders /></ProtectedRoute>} />
                </Routes>
              </BrowserRouter>
              <Toaster position="top-right" richColors />
            </div>
          </WishlistProvider>
        </CartProvider>
      </CustomerProvider>
    </LanguageProvider>
  );
}

export default App;
