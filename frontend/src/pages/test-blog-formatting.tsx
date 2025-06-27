import { useState } from 'react';
import Layout from '../components/Layout';
import RichTextEditor from '../components/RichTextEditor';

export default function TestBlogFormatting() {
  const [editorContent, setEditorContent] = useState('');
  const [displayContent, setDisplayContent] = useState('');

  const handleTest = () => {
    setDisplayContent(editorContent);
  };

  return (
    <Layout title="Test Blog Formatting">
      <div className="min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-white mb-8">Test Blog Formatting</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Editor Side */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Editor</h2>
              <RichTextEditor
                value={editorContent}
                onChange={setEditorContent}
                placeholder="Type your content here..."
              />
              
              <button
                onClick={handleTest}
                className="mt-4 px-6 py-3 rounded-lg text-white font-medium transition-all"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                }}
              >
                Test Display
              </button>

              {/* Raw HTML Output */}
              <div className="mt-4">
                <h3 className="text-sm font-bold text-gray-400 mb-2">Raw HTML Output:</h3>
                <pre className="p-4 bg-black/50 rounded-lg text-xs text-gray-300 overflow-x-auto">
                  {editorContent}
                </pre>
              </div>
            </div>

            {/* Display Side */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Display (with blog-content class)</h2>
              <div 
                className="p-6 rounded-lg"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <div 
                  className="blog-content"
                  dangerouslySetInnerHTML={{ __html: displayContent }}
                />
              </div>

              {/* Without blog-content class */}
              <h2 className="text-xl font-bold text-white mb-4 mt-8">Display (without blog-content class)</h2>
              <div 
                className="p-6 rounded-lg"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <div 
                  dangerouslySetInnerHTML={{ __html: displayContent }}
                  style={{ color: 'white' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 