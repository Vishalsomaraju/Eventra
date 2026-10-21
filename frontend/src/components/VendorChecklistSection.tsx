import React, { useState } from 'react';
import { VendorChecklistItem } from '../types';

interface VendorChecklistSectionProps {
  initialChecklist: VendorChecklistItem[];
}

const NEXT_STATUS: Record<VendorChecklistItem['status'], VendorChecklistItem['status']> = {
  pending: 'in_progress',
  in_progress: 'booked',
  booked: 'pending',
};

/**
 * Isolated Vendor Checklist Section.
 *
 * Performance boundary:
 * Toggling checklist status items updates only this component's local state,
 * preventing expensive rerenders of parent ResultsArea, Personalized Ideas,
 * Budget Breakdown table, and Planning Timeline milestones.
 */
export const VendorChecklistSection: React.FC<VendorChecklistSectionProps> = React.memo(
  ({ initialChecklist }) => {
    const [checklist, setChecklist] = useState<VendorChecklistItem[]>(initialChecklist);

    const handleToggleVendorStatus = (id: string) => {
      setChecklist((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          return { ...item, status: NEXT_STATUS[item.status] };
        })
      );
    };

    return (
      <section className="deliverable-section" aria-labelledby="vendor-title">
        <div className="deliverable-header">
          <div className="deliverable-title-group">
            <span className="deliverable-badge active">Artifact 4</span>
            <h3 id="vendor-title" className="deliverable-section-title">
              Actionable Vendor Checklist
            </h3>
          </div>
          <span className="checklist-helper-text">Click status tag to toggle progress</span>
        </div>

        <div className="vendor-checklist-table-container">
          <table className="vendor-table">
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Action Item</th>
                <th scope="col">Priority</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {checklist.map((item) => (
                <tr key={item.id} className={`status-row-${item.status}`}>
                  <td className="vendor-category">{item.category}</td>
                  <td className="vendor-task">{item.task}</td>
                  <td>
                    <span className={`priority-badge priority-${item.priority}`}>
                      {item.priority}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`status-toggle-btn status-${item.status}`}
                      onClick={() => handleToggleVendorStatus(item.id)}
                      aria-label={`Toggle status for ${item.task}, currently ${item.status}`}
                    >
                      {item.status === 'booked' && '✓ Booked'}
                      {item.status === 'in_progress' && '⏳ In Progress'}
                      {item.status === 'pending' && '○ Pending'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }
);
