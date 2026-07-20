// Ghi chú: Chọn class màu badge dùng chung theo trạng thái race.
export const raceStatusBadgeClass = (status: string) => {
  const classes: Record<string, string> = {
    draft: 'bg-gray-600/20 border border-gray-600/30 text-gray-300',
    'registration-open': 'bg-emerald-600/20 border border-emerald-600/30 text-emerald-400',
    'registration-closed': 'bg-yellow-600/20 border border-yellow-600/30 text-yellow-500',
    published: 'bg-sky-600/20 border border-sky-600/30 text-sky-400',
    'in-progress': 'bg-[#d4af37]/20 border border-[#d4af37]/30 text-[#f6d77a]',
    finished: 'bg-violet-600/20 border border-violet-600/30 text-violet-400',
    completed: 'bg-white/10 border border-white/20 text-white',
    cancelled: 'bg-red-600/20 border border-red-600/30 text-red-400',
  };

  return classes[status] || classes.draft;
};
