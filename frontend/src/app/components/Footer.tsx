import { Trophy } from 'lucide-react';

// Ghi chú: Hàm này render phần chân trang của website.
export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#071a2f] py-6">
      <div className="mx-auto flex max-w-[1920px] flex-col items-center justify-between gap-3 px-4 text-sm text-gray-400 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#d4af37]">
            <Trophy className="h-5 w-5 text-[#071a2f]" />
          </div>
          <span className="font-semibold text-white">Horse Racing Tournament System</span>
        </div>

        <span>PostgreSQL backed race, horse, jockey and referee management.</span>
      </div>
    </footer>
  );
}
