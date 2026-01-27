import { useEffect, useState } from 'react';
import { FileText, Save } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { pagesAPI } from '@/lib/api';

const pageKeys = ['about', 'contact', 'faq'];

export default function AdminPages() {
  const [pages, setPages] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingPage, setSavingPage] = useState(null);

  useEffect(() => {
    const fetchPages = async () => {
      try {
        const results = await Promise.all(
          pageKeys.map(key => pagesAPI.get(key))
        );
        const pagesData = {};
        results.forEach((res, index) => {
          pagesData[pageKeys[index]] = res.data;
        });
        setPages(pagesData);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPages();
  }, []);

  const handleUpdatePage = (pageKey, field, value) => {
    setPages({
      ...pages,
      [pageKey]: {
        ...pages[pageKey],
        [field]: value
      }
    });
  };

  const handleSavePage = async (pageKey) => {
    setSavingPage(pageKey);
    try {
      const page = pages[pageKey];
      await pagesAPI.update(pageKey, page.title, page.content);
      toast.success(`${pageKey.charAt(0).toUpperCase() + pageKey.slice(1)} page saved!`);
    } catch (error) {
      toast.error('Error saving page');
    } finally {
      setSavingPage(null);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Pages">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Pages">
      <div className="space-y-6" data-testid="admin-pages">
        <p className="text-white/60">Edit content for About, Contact, and FAQ pages</p>

        <Tabs defaultValue="about" className="w-full">
          <TabsList className="bg-card border border-white/10">
            {pageKeys.map((key) => (
              <TabsTrigger 
                key={key} 
                value={key}
                className="data-[state=active]:bg-gold-500 data-[state=active]:text-black"
                data-testid={`tab-${key}`}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>

          {pageKeys.map((pageKey) => (
            <TabsContent key={pageKey} value={pageKey} className="mt-6">
              <div className="bg-card border border-white/10 rounded-lg p-6 space-y-6">
                <div className="space-y-2">
                  <Label>Page Title</Label>
                  <Input
                    value={pages[pageKey]?.title || ''}
                    onChange={(e) => handleUpdatePage(pageKey, 'title', e.target.value)}
                    className="bg-black border-white/20"
                    data-testid={`page-title-${pageKey}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Page Content (HTML supported)</Label>
                  <div className="bg-black border border-white/20 rounded-lg">
                    {/* Rich Text Toolbar */}
                    <div className="flex items-center gap-2 p-2 border-b border-white/10">
                      <button
                        type="button"
                        className="p-2 rounded hover:bg-white/10 text-white/60 hover:text-white text-sm font-bold"
                        onClick={() => {
                          const content = pages[pageKey]?.content || '';
                          handleUpdatePage(pageKey, 'content', content + '<strong></strong>');
                        }}
                        title="Bold"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        className="p-2 rounded hover:bg-white/10 text-white/60 hover:text-white text-sm italic"
                        onClick={() => {
                          const content = pages[pageKey]?.content || '';
                          handleUpdatePage(pageKey, 'content', content + '<em></em>');
                        }}
                        title="Italic"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        className="p-2 rounded hover:bg-white/10 text-white/60 hover:text-white text-sm underline"
                        onClick={() => {
                          const content = pages[pageKey]?.content || '';
                          handleUpdatePage(pageKey, 'content', content + '<u></u>');
                        }}
                        title="Underline"
                      >
                        U
                      </button>
                      <div className="h-4 w-px bg-white/20 mx-2"></div>
                      <button
                        type="button"
                        className="px-2 py-1 rounded hover:bg-white/10 text-white/60 hover:text-white text-xs"
                        onClick={() => {
                          const content = pages[pageKey]?.content || '';
                          handleUpdatePage(pageKey, 'content', content + '<h2></h2>');
                        }}
                        title="Heading"
                      >
                        H2
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 rounded hover:bg-white/10 text-white/60 hover:text-white text-xs"
                        onClick={() => {
                          const content = pages[pageKey]?.content || '';
                          handleUpdatePage(pageKey, 'content', content + '<p></p>');
                        }}
                        title="Paragraph"
                      >
                        P
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 rounded hover:bg-white/10 text-white/60 hover:text-white text-xs"
                        onClick={() => {
                          const content = pages[pageKey]?.content || '';
                          handleUpdatePage(pageKey, 'content', content + '<ul><li></li></ul>');
                        }}
                        title="List"
                      >
                        • List
                      </button>
                    </div>
                    <Textarea
                      value={pages[pageKey]?.content || ''}
                      onChange={(e) => handleUpdatePage(pageKey, 'content', e.target.value)}
                      className="border-0 min-h-[300px] rounded-t-none"
                      placeholder="<p>Enter your content here...</p>"
                      data-testid={`page-content-${pageKey}`}
                    />
                  </div>
                  <p className="text-white/40 text-sm">
                    Use HTML tags for formatting: &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;h2&gt;
                  </p>
                </div>

                {/* Preview */}
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="bg-black border border-white/20 rounded-lg p-6 min-h-[200px]">
                    <div 
                      className="rich-text-content text-white/80"
                      dangerouslySetInnerHTML={{ __html: pages[pageKey]?.content || '<p class="text-white/40">Preview will appear here...</p>' }}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => handleSavePage(pageKey)}
                    disabled={savingPage === pageKey}
                    className="bg-gold-500 hover:bg-gold-600 text-black"
                    data-testid={`save-page-${pageKey}`}
                  >
                    {savingPage === pageKey ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </span>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save {pageKey.charAt(0).toUpperCase() + pageKey.slice(1)} Page
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AdminLayout>
  );
}
