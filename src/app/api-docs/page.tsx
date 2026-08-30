import Link from 'next/link';
import { ArrowLeft, BookOpen, ExternalLink } from 'lucide-react';

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-[#EBE7DF] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="w-9 h-9 rounded-2xl bg-[#F9F7F2] border border-[#E5E0D6] flex items-center justify-center text-[#7A7268] hover:text-[#201C1A] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif font-bold text-base text-[#201C1A]">
                Kopi Seruni API Reference
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-[#F2ECE4] text-[#54382B] font-bold text-[10px] border border-[#E0D8CC]">
                OpenAPI 3.0
              </span>
            </div>
            <p className="text-xs text-[#8E867C]">Dokumentasi endpoint & spesifikasi payload JSON</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <a
            href="/api/openapi.json"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 bg-[#FAF8F5] hover:bg-[#F2EDE5] text-[#201C1A] font-bold rounded-xl border border-[#E2DDD3] transition-colors flex items-center gap-1.5"
          >
            <span>Raw JSON Spec</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#8E867C]" />
          </a>
        </div>
      </header>

      {/* Swagger UI Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs overflow-hidden p-4 sm:p-6">
          <div
            id="swagger-ui"
            dangerouslySetInnerHTML={{
              __html: `
                <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
                <div id="swagger-container"></div>
                <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
                <script>
                  window.onload = function() {
                    SwaggerUIBundle({
                      url: '/api/openapi.json',
                      dom_id: '#swagger-container',
                      deepLinking: true,
                      presets: [
                        SwaggerUIBundle.presets.apis,
                        SwaggerUIBundle.SwaggerUIStandalonePreset
                      ],
                      layout: "BaseLayout"
                    });
                  };
                  if (window.SwaggerUIBundle) {
                    window.onload();
                  }
                </script>
              `,
            }}
          />
        </div>
      </main>
    </div>
  );
}
