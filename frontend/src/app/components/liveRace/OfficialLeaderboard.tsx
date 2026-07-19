import { Trophy } from 'lucide-react';
import {
  OfficialLeaderboardRow,
  resultOutcomeLabel,
} from './liveRaceDisplay';

interface OfficialLeaderboardProps {
  rows: OfficialLeaderboardRow[];
}

// Ghi chú: Render bảng xếp hạng draft do Referee ghi nhận.
export default function OfficialLeaderboard({ rows }: OfficialLeaderboardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#12304f] p-6">
      <div className="mb-5 flex items-center gap-3">
        <Trophy className="h-6 w-6 text-[#d4af37]" />
        <div>
          <h2 className="text-2xl font-black text-white">Official leaderboard</h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
            Recorded draft order
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/15 bg-[#071a2f] p-4 text-sm text-gray-500">
            No recorded runners yet.
          </div>
        )}

        {rows.map((row, index) => {
          const isFinished = row.outcome === 'finished';
          const resultLabel = isFinished && row.position
            ? `Official P${row.position}`
            : resultOutcomeLabel(row.outcome);
          const detail = isFinished
            ? row.finishTime || 'Time pending'
            : row.incidentReason || 'Incident reason pending';

          return (
            <div
              key={row.id}
              className={`grid grid-cols-[32px,18px,minmax(0,1fr)] items-center gap-3 rounded-xl border p-3 ${
                index === 0 && isFinished
                  ? 'border-[#d4af37]/45 bg-[#d4af37]/10'
                  : 'border-white/[0.07] bg-[#071a2f]'
              }`}
            >
              <div className="text-lg font-black text-white">
                {isFinished && row.position ? row.position : '-'}
              </div>
              <div className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: row.silkColor }} />
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-white">{row.horseName}</div>
                <div className={`truncate text-xs font-semibold ${
                  isFinished ? 'text-gray-300' : 'text-orange-300'
                }`}>
                  {resultLabel} • {detail}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
