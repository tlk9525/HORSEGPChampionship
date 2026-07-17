import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { ArrowLeft, Layers3, Pencil, Plus, Power, Save } from 'lucide-react';
import {
  RaceClassRecord,
  createRaceClass,
  getRaceClasses,
  updateRaceClass,
} from '../services/api';
import { messageToneClasses } from '../utils/messageTone';

interface RaceClassCatalogProps {
  onNavigate: (page: string) => void;
}

interface RaceClassForm {
  name: string;
  ratingMin: string;
  ratingMax: string;
  handicapMin: string;
  handicapMax: string;
  sortOrder: string;
  isActive: boolean;
}

const emptyForm = (): RaceClassForm => ({
  name: '',
  ratingMin: '',
  ratingMax: '',
  handicapMin: '',
  handicapMax: '',
  sortOrder: '0',
  isActive: true,
});

// Ghi chú: Hàm này chuyển một catalog record thành dữ liệu form có thể chỉnh sửa.
const formFromRaceClass = (raceClass: RaceClassRecord): RaceClassForm => ({
  name: raceClass.name,
  ratingMin: String(raceClass.ratingMin),
  ratingMax: String(raceClass.ratingMax),
  handicapMin: String(raceClass.handicapMin),
  handicapMax: String(raceClass.handicapMax),
  sortOrder: String(raceClass.sortOrder),
  isActive: raceClass.isActive,
});

// Ghi chú: Hàm này render danh mục class để admin quản lý rating và assigned weight.
export default function RaceClassCatalog({ onNavigate }: RaceClassCatalogProps) {
  const fieldClass =
    'min-h-[52px] w-full rounded-xl border border-white/10 bg-[#071a2f] px-4 py-3 text-white outline-none focus:border-[#d4af37]/70 focus:ring-2 focus:ring-[#d4af37]/20';
  const [raceClasses, setRaceClasses] = useState<RaceClassRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RaceClassForm>(emptyForm);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Ghi chú: Hàm này tải catalog mới nhất từ PostgreSQL qua API admin.
  const loadRaceClasses = () => {
    setIsLoading(true);
    getRaceClasses()
      .then(({ raceClasses: items }) => setRaceClasses(items))
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load race classes')
      )
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    window.scrollTo({ top: 0 });
    loadRaceClasses();
  }, []);

  // Ghi chú: Hàm này mở form chỉnh sửa một class đã có.
  const startEditing = (raceClass: RaceClassRecord) => {
    setEditingId(raceClass.id);
    setForm(formFromRaceClass(raceClass));
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Ghi chú: Hàm này lưu class mới hoặc cập nhật class hiện tại.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');

    const payload = {
      name: form.name.trim(),
      ratingMin: Number(form.ratingMin),
      ratingMax: Number(form.ratingMax),
      handicapMin: Number(form.handicapMin),
      handicapMax: Number(form.handicapMax),
      sortOrder: Number(form.sortOrder),
      isActive: form.isActive,
    };

    setIsSaving(true);
    try {
      const result = editingId
        ? await updateRaceClass(editingId, payload)
        : await createRaceClass(payload);
      setRaceClasses(result.raceClasses);
      setEditingId(null);
      setForm(emptyForm());
      setMessage(editingId ? 'Race class updated.' : 'Race class created.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save race class');
    } finally {
      setIsSaving(false);
    }
  };

  // Ghi chú: Hàm này bật hoặc tắt class khỏi form tạo race mới.
  const toggleActive = async (raceClass: RaceClassRecord) => {
    setMessage('');
    try {
      const result = await updateRaceClass(raceClass.id, {
        isActive: !raceClass.isActive,
      });
      setRaceClasses(result.raceClasses);
      setMessage(
        `${raceClass.name} updated: ${raceClass.isActive ? 'deactivated' : 'activated'}.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update race class');
    }
  };

  return (
    <div className="min-h-screen bg-[#071a2f] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={() => onNavigate('admin')}
          className="mb-8 flex items-center gap-2 text-gray-400 transition-colors hover:text-white"
        >
          <ArrowLeft size={20} />
          Back to Admin
        </button>

        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <Layers3 className="h-8 w-8 text-[#d4af37]" />
            <h1 className="text-4xl font-black text-white">Race Class Catalog</h1>
          </div>
          <p className="text-gray-400">
            Rating and weight values are copied into each new race as a fixed snapshot.
          </p>
        </div>

        {message && (
          <div className={`mb-6 rounded-xl border px-4 py-3 font-semibold ${messageToneClasses(message)}`}>
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-3xl border border-white/10 bg-[#12304f] p-8"
        >
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-white">
              {editingId ? 'Edit Race Class' : 'Add Race Class'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm());
                }}
                className="text-sm font-semibold text-gray-300 hover:text-white"
              >
                Cancel edit
              </button>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-semibold text-gray-300">
              Class Name
              <input
                required
                maxLength={128}
                className={`${fieldClass} mt-2`}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="e.g. Class 6"
              />
            </label>
            <label className="text-sm font-semibold text-gray-300">
              Minimum Rating
              <input
                required
                type="number"
                min="0"
                max="140"
                step="1"
                className={`${fieldClass} mt-2`}
                value={form.ratingMin}
                onChange={(event) => setForm({ ...form, ratingMin: event.target.value })}
              />
            </label>
            <label className="text-sm font-semibold text-gray-300">
              Maximum Rating
              <input
                required
                type="number"
                min="0"
                max="140"
                step="1"
                className={`${fieldClass} mt-2`}
                value={form.ratingMax}
                onChange={(event) => setForm({ ...form, ratingMax: event.target.value })}
              />
            </label>
            <label className="text-sm font-semibold text-gray-300">
              Minimum Weight (lb)
              <input
                required
                type="number"
                min="110"
                max="135"
                step="1"
                className={`${fieldClass} mt-2`}
                value={form.handicapMin}
                onChange={(event) => setForm({ ...form, handicapMin: event.target.value })}
              />
            </label>
            <label className="text-sm font-semibold text-gray-300">
              Top Weight (lb)
              <input
                required
                type="number"
                min="110"
                max="135"
                step="1"
                className={`${fieldClass} mt-2`}
                value={form.handicapMax}
                onChange={(event) => setForm({ ...form, handicapMax: event.target.value })}
              />
            </label>
            <label className="text-sm font-semibold text-gray-300">
              Display Order
              <input
                required
                type="number"
                min="0"
                step="1"
                className={`${fieldClass} mt-2`}
                value={form.sortOrder}
                onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-gray-200">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                className="h-5 w-5 accent-[#d4af37]"
              />
              Available in Race Builder
            </label>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-[#d4af37] px-6 py-3 font-bold text-[#071a2f] transition-colors hover:bg-[#e5c34d] disabled:opacity-60"
            >
              {editingId ? <Save size={19} /> : <Plus size={19} />}
              {isSaving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Class'}
            </button>
          </div>
        </form>

        <div className="rounded-3xl border border-white/10 bg-[#12304f] p-8">
          <h2 className="mb-6 text-2xl font-black text-white">Configured Classes</h2>
          {isLoading ? (
            <p className="text-gray-400">Loading race classes...</p>
          ) : raceClasses.length === 0 ? (
            <p className="text-gray-400">No race classes configured.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {raceClasses.map((raceClass) => (
                <div
                  key={raceClass.id}
                  className="rounded-2xl border border-white/10 bg-[#071a2f] p-5"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-bold text-white">{raceClass.name}</h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            raceClass.isActive
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-gray-500/15 text-gray-400'
                          }`}
                        >
                          {raceClass.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">Order {raceClass.sortOrder}</p>
                    </div>
                  </div>
                  <div className="mb-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-white/5 p-3">
                      <div className="text-gray-500">Rating</div>
                      <div className="mt-1 font-bold text-white">
                        {raceClass.ratingMin} - {raceClass.ratingMax}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3">
                      <div className="text-gray-500">Assigned Weight</div>
                      <div className="mt-1 font-bold text-white">
                        {raceClass.handicapMin} - {raceClass.handicapMax} lb
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => startEditing(raceClass)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-2.5 font-semibold text-[#d4af37] hover:bg-[#d4af37]/20"
                    >
                      <Pencil size={17} /> Edit
                    </button>
                    <button
                      onClick={() => toggleActive(raceClass)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-semibold text-gray-200 hover:bg-white/10"
                    >
                      <Power size={17} /> {raceClass.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
