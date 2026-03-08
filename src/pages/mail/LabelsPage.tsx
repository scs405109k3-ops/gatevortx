import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Tag, ArrowLeft } from 'lucide-react';
import { useMailLabels } from '../../hooks/useMailLabels';
import { toast } from '../../hooks/use-toast';

const PRESET_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

const LabelsPage: React.FC = () => {
  const navigate = useNavigate();
  const { labels, createLabel, deleteLabel } = useMailLabels();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) { toast({ title: 'Enter a label name', variant: 'destructive' }); return; }
    setCreating(true);
    await createLabel(newName.trim(), newColor);
    setNewName('');
    setCreating(false);
    toast({ title: `Label "${newName}" created` });
  };

  const handleDelete = async (id: string, name: string) => {
    await deleteLabel(id);
    toast({ title: `Label "${name}" deleted` });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 md:px-6 py-4 border-b border-border bg-card flex items-center gap-3">
        <button onClick={() => navigate('/mail/inbox')} className="p-2 hover:bg-muted rounded-lg transition-colors text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Manage Labels</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 max-w-lg mx-auto w-full space-y-6">
        {/* Create */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Create New Label
          </h2>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Label name…"
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary mb-3"
          />
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`h-7 w-7 rounded-full transition-all ${newColor === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 active:scale-95 transition-all"
          >
            {creating ? 'Creating…' : 'Create Label'}
          </button>
        </div>

        {/* Existing Labels */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Your Labels</h2>
          {labels.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Tag className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No labels yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {labels.map(label => (
                <div key={label.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                  <span className="h-3.5 w-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                  <span className="flex-1 text-sm font-medium text-foreground">{label.name}</span>
                  <button
                    onClick={() => handleDelete(label.id, label.name)}
                    className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LabelsPage;
