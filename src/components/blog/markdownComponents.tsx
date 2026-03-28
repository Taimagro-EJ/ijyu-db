// src/components/blog/markdownComponents.tsx
import type { Components } from 'react-markdown';
import ChatCTA from './ChatCTA';

export const markdownComponents: Components = {
  h1: () => null,
  h2: ({ children }) => (
    <h2 className="text-xl sm:text-2xl font-bold text-[#454034] mt-12 mb-4 border-l-4 border-[#D46B3A] pl-4"
        style={{ fontFamily: "'Shippori Mincho', serif" }}>{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-bold text-[#454034] mt-8 mb-3">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-[17px] text-[#454034] leading-[2.0] mb-6">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-6 mb-6 space-y-2 text-[17px] text-[#454034] leading-[1.8]">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 mb-6 space-y-2 text-[17px] text-[#454034] leading-[1.8]">{children}</ol>
  ),
  li: ({ children }) => <li className="text-[#454034]">{children}</li>,
  strong: ({ children }) => <strong className="font-bold text-[#D46B3A]">{children}</strong>,
  em: ({ children }) => <em className="italic text-[#6B6457]">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-[#D46B3A]/40 pl-4 my-6 text-[#6B6457] italic bg-[#F2F0EC] py-3 pr-4 rounded-r-lg">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-8">
      <table className="w-full text-sm border-collapse border border-[#E8E4DF] rounded-lg overflow-hidden">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-[#F2F0EC]">{children}</thead>,
  th: ({ children }) => (
    <th className="px-4 py-2 text-left text-xs font-bold text-[#6B6457] border border-[#E8E4DF]">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2 text-sm text-[#454034] border border-[#E8E4DF]">{children}</td>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <pre className="bg-[#1A1814] text-[#F2F0EC] p-4 rounded-xl overflow-x-auto mb-6 text-sm">
          <code style={{ fontFamily: "'DM Mono', monospace" }}>{children}</code>
        </pre>
      );
    }
    return (
      <code className="bg-[#F2F0EC] text-[#D46B3A] px-1.5 py-0.5 rounded text-sm"
            style={{ fontFamily: "'DM Mono', monospace" }}>{children}</code>
    );
  },
  hr: () => <ChatCTA />,
  a: ({ href, children }) => (
    <a href={href} className="text-[#D46B3A] underline underline-offset-2 hover:text-[#C05A2E] transition-colors">{children}</a>
  ),
};
