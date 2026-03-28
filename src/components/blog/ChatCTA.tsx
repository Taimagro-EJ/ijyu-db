// src/components/blog/ChatCTA.tsx
export default function ChatCTA({ cityName }: { cityName?: string }) {
  return (
    <div className="my-10 p-6 bg-gradient-to-r from-[#F2F0EC] to-[#F0DBC8] 
                    rounded-2xl border border-[#E8E4DF]">
      <div className="flex items-start gap-4">
        <span className="text-3xl flex-shrink-0">🤖</span>
        <div>
          <p className="font-bold text-[#454034] text-lg mb-2"
             style={{ fontFamily: "'Shippori Mincho', serif" }}>
            {cityName
              ? `${cityName}への移住、あなたの条件で試算してみませんか？`
              : 'あなたの条件で移住先を探してみませんか？'}
          </p>
          <p className="text-sm text-[#6B6457] mb-4">
            527市町村のデータから、年収・家族構成・希望条件に合う移住先をAIが提案します。
          </p>
          
            href="/chat"
            className="inline-block px-6 py-2.5 bg-[#D46B3A] text-white text-sm font-medium
                       rounded-lg hover:bg-[#C05A2E] transition-colors"
          >
            AIに無料相談する &#8594;
          </a>
        </div>
      </div>
    </div>
  );
}
