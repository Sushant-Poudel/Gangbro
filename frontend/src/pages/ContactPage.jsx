import { useEffect, useState } from 'react';
import { Mail, MessageCircle, MapPin } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { pagesAPI } from '@/lib/api';

const WHATSAPP_NUMBER = "9779743488871";

export default function ContactPage() {
  const [pageData, setPageData] = useState({ title: 'Contact Us', content: '' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    pagesAPI.get('contact')
      .then(res => setPageData(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleWhatsApp = () => {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=Hi! I have a question about your products.`, '_blank');
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <main className="pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16" data-testid="contact-page">
          {isLoading ? (
            <div className="space-y-6">
              <div className="h-12 w-1/2 skeleton rounded"></div>
              <div className="h-40 skeleton rounded"></div>
            </div>
          ) : (
            <>
              <h1 className="font-heading text-4xl md:text-5xl font-bold text-white uppercase tracking-tight mb-8">
                {pageData.title}
              </h1>
              
              {pageData.content ? (
                <div 
                  className="rich-text-content text-white/80 leading-relaxed mb-12"
                  dangerouslySetInnerHTML={{ __html: pageData.content }}
                />
              ) : null}

              {/* Contact Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                <div className="bg-card border border-white/10 rounded-lg p-6 hover:border-gold-500/50 transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-gold-500/10">
                      <Mail className="h-6 w-6 text-gold-500" />
                    </div>
                    <h3 className="font-heading text-xl font-semibold text-white uppercase">Email Us</h3>
                  </div>
                  <p className="text-white/60 mb-4">For general inquiries and support</p>
                  <a 
                    href="mailto:support@gameshopnepal.com" 
                    className="text-gold-500 hover:text-gold-400 font-semibold"
                    data-testid="contact-email"
                  >
                    support@gameshopnepal.com
                  </a>
                </div>

                <div className="bg-card border border-white/10 rounded-lg p-6 hover:border-gold-500/50 transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <MessageCircle className="h-6 w-6 text-green-500" />
                    </div>
                    <h3 className="font-heading text-xl font-semibold text-white uppercase">WhatsApp</h3>
                  </div>
                  <p className="text-white/60 mb-4">Quick response for orders and queries</p>
                  <Button 
                    onClick={handleWhatsApp}
                    className="whatsapp-btn text-white"
                    data-testid="contact-whatsapp"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Chat on WhatsApp
                  </Button>
                </div>
              </div>

              {/* Location */}
              <div className="bg-card/50 border border-white/10 rounded-lg p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-lg bg-gold-500/10">
                    <MapPin className="h-6 w-6 text-gold-500" />
                  </div>
                  <h3 className="font-heading text-xl font-semibold text-white uppercase">Location</h3>
                </div>
                <p className="text-white/60">
                  We operate online across Nepal. Serving customers nationwide since 2021.
                </p>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
