import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Youtube, Plus, Trash2, Check, Edit2, User, Heart, Info, KeyRound, Copy, ShieldOff } from 'lucide-react';
import {
  createShare,
  revokeShare,
  generateShareCode,
  type ShareEntry,
} from '../services/share';
import {
  Channel,
  ChannelMode,
  Transaction,
  SelfChannel,
  CHANNEL_COLORS,
  CHANNEL_MODE_SHORT,
  channelMode,
  modeFlags,
  isSelfTx,
  channelInfo,
  DEFAULT_SELF_COLOR,
} from '../types';

interface ChannelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Channel[];
  transactions: Transaction[];
  selfChannel: SelfChannel | undefined;
  onChange: (channels: Channel[]) => void;
  onSelfChange: (self: SelfChannel) => void;
  /** Egasining parol xeshi — ulashish yaratish uchun kerak. */
  ownerHash: string;
  shares: ShareEntry[];
  onSharesChange: (shares: ShareEntry[]) => void;
}

/** Uch rejim uchun tugmalar tavsifi — qo'shishda ham, tahrirlashda ham bir xil. */
const MODE_OPTIONS: {
  key: ChannelMode;
  title: string;
  hint: string;
  icon: React.ElementType;
  active: string;
}[] = [
  {
    key: 'own_charity',
    title: 'Meniki — ehsonli',
    hint: 'Shaxsiy statistikaga kiradi va ehson ushlanadi',
    icon: Heart,
    active: 'border-amber-400 bg-amber-50 text-amber-700 ring-1 ring-amber-300',
  },
  {
    key: 'own_plain',
    title: 'Meniki — ehsonsiz',
    hint: 'Shaxsiy statistikaga kiradi, lekin ehson ushlanmaydi',
    icon: User,
    active: 'border-indigo-400 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300',
  },
  {
    key: 'other',
    title: 'Boshqa kanal',
    hint: 'Meniki emas: shaxsiy statistikaga ham, ehsonga ham kirmaydi',
    icon: Youtube,
    active: 'border-rose-400 bg-rose-50 text-rose-700 ring-1 ring-rose-300',
  },
];

const ModePicker: React.FC<{ value: ChannelMode; onChange: (m: ChannelMode) => void }> = ({
  value,
  onChange,
}) => (
  <div className="space-y-1.5">
    {MODE_OPTIONS.map((o) => {
      const Icon = o.icon;
      const on = value === o.key;
      return (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`w-full flex items-start gap-2.5 text-left px-3 py-2 rounded-xl border transition-all active:scale-[0.99] ${
            on ? o.active : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span className="min-w-0">
            <span className="block text-[11px] font-black">{o.title}</span>
            <span className="block text-[9px] font-semibold opacity-70 leading-snug">{o.hint}</span>
          </span>
          {on && <Check className="w-3.5 h-3.5 ml-auto mt-0.5 shrink-0" />}
        </button>
      );
    })}
  </div>
);

/** Ro'yxatdagi kanal yonidagi kichik nishon. */
const modeBadge = (m: ChannelMode) => {
  if (m === 'own_charity') return 'text-amber-600 bg-amber-50';
  if (m === 'own_plain') return 'text-indigo-600 bg-indigo-50';
  return 'text-slate-400 bg-slate-100';
};

export const ChannelsModal: React.FC<ChannelsModalProps> = ({
  isOpen,
  onClose,
  channels,
  transactions,
  selfChannel,
  onChange,
  onSelfChange,
  ownerHash,
  shares,
  onSharesChange,
}) => {
  const [newName, setNewName] = useState('');
  const [newMode, setNewMode] = useState<ChannelMode>('other');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editMode, setEditMode] = useState<ChannelMode>('other');
  const [editingSelf, setEditingSelf] = useState(false);
  const [selfName, setSelfName] = useState('');
  const [selfColor, setSelfColor] = useState(DEFAULT_SELF_COLOR);
  const [shareBusy, setShareBusy] = useState<string | null>(null);
  const [shareError, setShareError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const self = channelInfo(undefined, channels, selfChannel);

  const startEditSelf = () => {
    setSelfName(selfChannel?.name || '');
    setSelfColor(selfChannel?.color || DEFAULT_SELF_COLOR);
    setEditingSelf(true);
  };

  const saveSelf = () => {
    const name = selfName.trim();
    if (!name) return;
    onSelfChange({ name, color: selfColor });
    setEditingSelf(false);
  };

  if (!isOpen) return null;

  const selfCount = transactions.filter(isSelfTx).length;
  const countFor = (id: string) => transactions.filter((t) => t.channelId === id).length;

  const addChannel = () => {
    const name = newName.trim();
    if (!name) return;
    const id = `ch-${Date.now()}`;
    const color = CHANNEL_COLORS[channels.length % CHANNEL_COLORS.length];
    onChange([...channels, { id, name, color, ...modeFlags(newMode) }]);
    setNewName('');
    setNewMode('other');
  };

  const startEdit = (c: Channel) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditMode(channelMode(c));
  };

  const saveEdit = (id: string) => {
    const name = editName.trim();
    if (!name) return;
    onChange(channels.map((c) => (c.id === id ? { ...c, name, ...modeFlags(editMode) } : c)));
    setEditingId(null);
    setEditName('');
  };

  const shareFor = (channelId: string) => shares.find((x) => x.channelId === channelId);

  const giveAccess = async (c: Channel) => {
    setShareError('');
    setShareBusy(c.id);
    const code = generateShareCode();
    const result = await createShare(ownerHash, code, c.id, c.name, c.color);
    setShareBusy(null);
    if (result === 'ok') {
      onSharesChange([
        ...shares.filter((x) => x.channelId !== c.id),
        { code, channelId: c.id, label: c.name, createdAt: Date.now() },
      ]);
      return;
    }
    setShareError(
      result === 'taken'
        ? "Parol band bo'lib chiqdi — qayta urinib ko'ring."
        : "Kirish berib bo'lmadi. Internetni tekshirib, qayta urinib ko'ring."
    );
  };

  const takeAccess = async (c: Channel) => {
    const entry = shareFor(c.id);
    if (!entry) return;
    if (!confirm(`«${c.name}» uchun berilgan kirish bekor qilinsinmi? Parol shu zahoti ishlamay qoladi.`)) return;
    setShareError('');
    setShareBusy(c.id);
    const ok = await revokeShare(ownerHash, entry.code);
    setShareBusy(null);
    if (ok) onSharesChange(shares.filter((x) => x.channelId !== c.id));
    else setShareError("Bekor qilib bo'lmadi. Qayta urinib ko'ring.");
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setShareError('Nusxa olinmadi — parolni qo\'lda ko\'chiring.');
    }
  };

  const removeChannel = (id: string, name: string) => {
    const n = countFor(id);
    const msg =
      n > 0
        ? `"${name}" kanalini o'chirmoqchimisiz? Unga tegishli ${n} ta yozuv saqlanadi, lekin kanal nomsiz "Boshqa kanal" bo'lib ko'rinadi.`
        : `"${name}" kanalini o'chirmoqchimisiz?`;
    if (confirm(msg)) {
      onChange(channels.filter((c) => c.id !== id));
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          className="card-3d max-w-lg w-full p-6 md:p-7 bg-white/95 border border-white/50 shadow-2xl overflow-y-auto max-h-[90vh]"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title */}
          <div className="flex items-center gap-3 mb-5 relative z-10 border-b border-slate-100 pb-4 pr-10">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-100">
              <Youtube className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-black text-xl text-slate-800">Kanallar</h2>
              <p className="text-xs text-slate-400 font-semibold">
                Har bir kanal uchun rejimni tanlang
              </p>
            </div>
          </div>

          {/* Shaxsiy kanal — nomi va rangi tahrirlanadi */}
          <div className="p-3.5 mb-3 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
            {editingSelf ? (
              <div className="space-y-2.5">
                <label className="block text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                  Shaxsiy kanalimning nomi
                </label>
                <input
                  autoFocus
                  value={selfName}
                  onChange={(e) => setSelfName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveSelf()}
                  placeholder="Masalan: NA BNG"
                  className="w-full text-sm font-semibold px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 placeholder-slate-300"
                />
                <div>
                  <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1.5">
                    Rangi
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[DEFAULT_SELF_COLOR, ...CHANNEL_COLORS].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelfColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-7 h-7 rounded-lg transition-all ${
                          selfColor === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''
                        }`}
                        aria-label={c}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={saveSelf}
                    disabled={!selfName.trim()}
                    className="flex items-center gap-1.5 py-2 px-4 bg-indigo-600 text-white font-bold text-[11px] rounded-xl transition-all active:scale-95 disabled:opacity-40"
                  >
                    <Check className="w-3.5 h-3.5" /> Saqlash
                  </button>
                  <button
                    onClick={() => setEditingSelf(false)}
                    className="py-2 px-3 bg-white text-slate-500 font-bold text-[11px] rounded-xl transition-all active:scale-95"
                  >
                    Bekor
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: self.color }}
                  >
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{self.name}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      {selfCount} ta yozuv · ehson ushlanadi
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider bg-white/70 px-2.5 py-1 rounded-lg">
                    Asosiy
                  </span>
                  <button
                    onClick={startEditSelf}
                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-white/70 transition-all"
                    title="Nomi va rangini o'zgartirish"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Other channels */}
          <div className="space-y-2.5 mb-5">
            {channels.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-4">
                Hali boshqa kanal qo'shilmagan.
              </p>
            )}
            {channels.map((c) => {
              const mode = channelMode(c);
              const share = shareFor(c.id);
              return (
                <div
                  key={c.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60"
                >
                  {editingId === c.id ? (
                    <div className="space-y-2.5">
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(c.id)}
                        className="w-full text-sm font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                      />
                      <ModePicker value={editMode} onChange={setEditMode} />
                      {mode !== editMode && countFor(c.id) > 0 && (
                        <p className="flex items-start gap-1.5 text-[9px] font-semibold text-slate-500 bg-white border border-slate-200 rounded-xl px-2.5 py-2">
                          <Info className="w-3 h-3 mt-px shrink-0" />
                          Rejim o'zgarsa, bu kanalning {countFor(c.id)} ta eski yozuvi ham yangi
                          qoidaga ko'ra qayta hisoblanadi.
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveEdit(c.id)}
                          disabled={!editName.trim()}
                          className="flex items-center gap-1.5 py-2 px-4 bg-emerald-500 text-white font-bold text-[11px] rounded-xl hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-40"
                        >
                          <Check className="w-3.5 h-3.5" /> Saqlash
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="py-2 px-3 bg-white text-slate-500 font-bold text-[11px] rounded-xl transition-all active:scale-95"
                        >
                          Bekor
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: c.color || '#0ea5e9' }}
                        >
                          {c.owned ? <User className="w-4 h-4" /> : <Youtube className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{c.name}</p>
                            <span
                              className={`shrink-0 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-md ${modeBadge(mode)}`}
                            >
                              {CHANNEL_MODE_SHORT[mode]}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold">
                            {countFor(c.id)} ta yozuv
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => startEdit(c)}
                          className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                          title="Nomi va rejimini tahrirlash"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeChannel(c.id, c.name)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                          title="O'chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Kanal egasiga faqat ko'rish uchun kirish berish */}
                  {editingId !== c.id && (
                    <div className="mt-3 pt-3 border-t border-slate-200/70">
                      {share ? (
                        <div className="space-y-2">
                          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                            Kirish berilgan · faqat ko'rish
                          </p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 min-w-0 truncate font-mono text-[13px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 select-all">
                              {share.code}
                            </code>
                            <button
                              onClick={() => copyCode(share.code)}
                              className="shrink-0 flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold transition-all"
                            >
                              {copied === share.code ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              {copied === share.code ? 'Olindi' : 'Nusxa'}
                            </button>
                            <button
                              onClick={() => takeAccess(c)}
                              disabled={shareBusy === c.id}
                              className="shrink-0 flex items-center gap-1 py-1.5 px-2.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 text-[10px] font-bold transition-all"
                            >
                              <ShieldOff className="w-3 h-3" /> Bekor
                            </button>
                          </div>
                          <p className="text-[9px] text-slate-400 font-semibold leading-snug">
                            Shu parol bilan kanal egasi FAQAT o'z kanalini ko'radi. Sizning
                            daromadingiz va ehsoningiz unga ko'rinmaydi, hech narsa o'zgartira olmaydi.
                          </p>
                        </div>
                      ) : (
                        <button
                          onClick={() => giveAccess(c)}
                          disabled={shareBusy === c.id}
                          className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 text-[10.5px] font-bold transition-all"
                        >
                          <KeyRound className="w-3 h-3" />
                          {shareBusy === c.id ? 'Yaratilmoqda...' : 'Egasiga kirish berish'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {shareError && (
            <p className="mb-3 text-[11px] font-semibold text-rose-500 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
              {shareError}
            </p>
          )}

          {/* Add new channel */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Yangi kanal qo'shish
            </p>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addChannel()}
              placeholder="Kanal nomi (masalan: Do'stim kanali)"
              className="w-full text-sm font-semibold px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-700 placeholder-slate-300"
            />
            <ModePicker value={newMode} onChange={setNewMode} />
            <button
              onClick={addChannel}
              disabled={!newName.trim()}
              className="w-full flex items-center justify-center gap-1.5 py-3 px-4 bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold text-xs rounded-xl transition-all active:scale-95 shadow-lg shadow-rose-200/50 disabled:opacity-40"
            >
              <Plus className="w-4 h-4" /> Qo'shish
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
