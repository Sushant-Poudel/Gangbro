import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { pagesAPI } from '@/lib/api';

const defaultFAQs = [
  {
    question: "How do I place an order?",
    answer: "Simply browse our products, select the plan you want, and click 'Order Now'. This will redirect you to WhatsApp where you can complete your order with our support team."
  },
  {
    question: "How long does delivery take?",
    answer: "Most products are delivered instantly within minutes after payment confirmation. Some products may take up to 24 hours depending on availability."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept eSewa, Khalti, bank transfer, and other local payment methods. Payment details will be shared via WhatsApp when you place an order."
  },
  {
    question: "Are your products genuine?",
    answer: "Yes! All our products are 100% genuine and sourced directly from authorized channels. We have been operating since 2021 with thousands of satisfied customers."
  },
  {
    question: "What if I face any issues with my purchase?",
    answer: "Contact us immediately via WhatsApp or email at support@gameshopnepal.com. Our support team is available 24/7 to assist you."
  },
  {
    question: "Can I get a refund?",
    answer: "We offer refunds for products that cannot be delivered or are not as described. Contact our support team for refund requests within 24 hours of purchase."
  }
];

export default function FAQPage() {
  const [pageData, setPageData] = useState({ title: 'FAQ', content: '' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    pagesAPI.get('faq')
      .then(res => setPageData(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <main className="pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16" data-testid="faq-page">
          {isLoading ? (
            <div className="space-y-6">
              <div className="h-12 w-1/2 skeleton rounded"></div>
              <div className="h-40 skeleton rounded"></div>
            </div>
          ) : (
            <>
              <h1 className="font-heading text-4xl md:text-5xl font-bold text-white uppercase tracking-tight mb-4">
                {pageData.title}
              </h1>
              <p className="text-white/60 mb-12">
                Find answers to commonly asked questions about our products and services.
              </p>

              {pageData.content ? (
                <div 
                  className="rich-text-content text-white/80 leading-relaxed mb-12"
                  dangerouslySetInnerHTML={{ __html: pageData.content }}
                />
              ) : null}

              {/* FAQ Accordion */}
              <Accordion type="single" collapsible className="space-y-4">
                {defaultFAQs.map((faq, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`item-${index}`}
                    className="bg-card border border-white/10 rounded-lg px-6 data-[state=open]:border-gold-500/50"
                    data-testid={`faq-item-${index}`}
                  >
                    <AccordionTrigger className="font-heading text-lg font-semibold text-white hover:text-gold-500 py-4">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-white/70 pb-4 leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {/* Still Have Questions */}
              <div className="mt-12 text-center bg-card/50 border border-white/10 rounded-lg p-8">
                <h3 className="font-heading text-2xl font-semibold text-white uppercase mb-4">
                  Still Have Questions?
                </h3>
                <p className="text-white/60 mb-4">
                  Can't find what you're looking for? Contact our support team.
                </p>
                <a 
                  href="mailto:support@gameshopnepal.com"
                  className="text-gold-500 hover:text-gold-400 font-semibold"
                >
                  support@gameshopnepal.com
                </a>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
