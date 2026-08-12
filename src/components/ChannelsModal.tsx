import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Youtube, Plus, Trash2, Check, Edit2, User } from 'lucide-react';
import {
  Channel,
  Transaction,
  SelfChannel,
  CHANNEL_COLORS,
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
}

export const ChannelsModal: React.FC<ChannelsModalProps> = ({
  isOpen,
  onClose,
  channels,
  transactions,
  selfChannel,
  onChange,
  onSelfChange,
}) => {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editingSelf, setEditingSelf] = useState(false);
  const [selfName, setSelfName] = useState('');
  const [selfColor, setSelfColor] = useState(DEFAULT_SELF_COLOR);

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
    onChange([...channels, { id, name, color }]);
    setNewName('');
  };

  const saveEdit = (id: string) => {
    const name = editName.trim();
    if (!name) return;
    onChange(channels.map((c) => (c.id === id ? { ...c, name } : c)));
    setEditingId(null);
    setEditName('');
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
          <div className="flex items-center gap-3 mb-6 relative z-10 border-b border-slate-100 pb-4 pr-10">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-100">
              <Youtube className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-black text-xl text-slate-800">Kanallar</h2>
              <p className="text-xs text-slate-400 font-semibold">
                Boshqa kanallardan ehson ushlanmaydi
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
            {channels.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60"
              >
                {editingId === c.id ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(c.id)}
                      className="flex-1 text-sm font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                    />
                    <button
                      onClick={() => saveEdit(c.id)}
                      className="p-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-2 rounded-xl bg-slate-200 text-slate-500 hover:bg-slate-300 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: c.color || '#0ea5e9' }}
                      >
                        <Youtube className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{c.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">
                          {countFor(c.id)} ta yozuv · ehsonsiz
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingId(c.id);
                          setEditName(c.name);
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                        title="Nomini tahrirlash"
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
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add new channel */}
          <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addChannel()}
              placeholder="Yangi kanal nomi (masalan: Do'stim kanali)"
              className="flex-1 text-sm font-semibold px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-700 placeholder-slate-300"
            />
            <button
              onClick={addChannel}
              disabled={!newName.trim()}
              className="flex items-center gap-1.5 py-3 px-4 bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold text-xs rounded-xl transition-all active:scale-95 shadow-lg shadow-rose-200/50 disabled:opacity-40"
            >
              <Plus className="w-4 h-4" /> Qo'shish
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
