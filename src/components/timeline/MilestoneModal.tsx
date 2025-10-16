import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, Calendar, Droplets } from 'lucide-react';
import { useMilestones, Milestone } from './MilestoneContext';

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLOURS = ['#7C3AED','#EF4444','#10B981','#3B82F6','#F59E0B','#EC4899','#14B8A6','#8B5CF6'];

export const MilestoneModal: React.FC<MilestoneModalProps> = ({ isOpen, onClose }) => {
  const { milestones, addMilestone, updateMilestone, deleteMilestone } = useMilestones();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [formData, setFormData] = useState<{ name: string; date: string; color: string }>({
    name: '',
    date: '',
    color: PRESET_COLOURS[0],
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.date) return;

    if (editingId) {
      updateMilestone(editingId, formData);
      setEditingId(null);
    } else {
      addMilestone(formData);
      setIsAdding(false);
    }
    setFormData({ name: '', date: '', color: PRESET_COLOURS[0] });
  };

  const handleEdit = (milestone: Milestone) => {
    setEditingId(milestone.id);
    setFormData({ name: milestone.name, date: milestone.date, color: milestone.color || PRESET_COLOURS[0] });
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', date: '', color: PRESET_COLOURS[0] });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this milestone?')) {
      deleteMilestone(id);
    }
  };

  const sortedMilestones = [...milestones].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-purple-600" />
            <h2 className="text-2xl font-semibold text-gray-900">Milestones</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Add/Edit Form */}
          {isAdding ? (
            <form onSubmit={handleSubmit} className="mb-6 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {editingId ? 'Edit Milestone' : 'Add New Milestone'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Milestone Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Product Launch, Beta Release"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                {/* Colour Picker */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Colour</label>
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Swatches */}
                    {PRESET_COLOURS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: c })}
                        className={`w-7 h-7 rounded-full border transition-transform hover:scale-105 ${formData.color === c ? 'ring-2 ring-offset-2 ring-purple-500' : ''}`}
                        style={{ backgroundColor: c, borderColor: 'rgba(0,0,0,0.08)' }}
                        aria-label={`Select colour ${c}`}
                      />
                    ))}
                    {/* Custom */}
                    <label className="flex items-center gap-2 text-xs text-gray-600 border rounded-lg px-2 py-1">
                      <Droplets className="w-4 h-4" />
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer"
                        aria-label="Custom colour"
                      />
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-24 px-1 py-1 text-xs border border-gray-200 rounded"
                        placeholder="#7C3AED"
                      />
                    </label>
                    {/* Preview pill */}
                    <span className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full border"
                          style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                      <span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: formData.color }} />
                      {formData.color}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    {editingId ? 'Update' : 'Add'} Milestone
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full mb-6 px-4 py-3 text-sm font-medium text-purple-600 bg-purple-50 border-2 border-dashed border-purple-300 rounded-lg hover:bg-purple-100 hover:border-purple-400 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add New Milestone
            </button>
          )}

          {/* Milestones List */}
          {sortedMilestones.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">No milestones yet</p>
              <p className="text-gray-400 text-xs mt-1">Add your first milestone to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedMilestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="inline-block w-3.5 h-3.5 rounded-full border"
                      style={{ backgroundColor: milestone.color, borderColor: 'rgba(0,0,0,0.08)' }}
                      title={milestone.color}
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">
                        {milestone.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(milestone.date).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(milestone)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit milestone"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(milestone.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete milestone"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
