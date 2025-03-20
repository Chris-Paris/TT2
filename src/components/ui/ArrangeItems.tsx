import { MoveVertical, Trash2 } from 'lucide-react';
import React from 'react';
import { Button } from './button';

interface ArrangeItemsProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  onReorder: (sourceIndex: number, targetIndex: number) => void;
  onDelete?: (index: number) => void;
  itemClassName?: string;
  dragHandleClassName?: string;
  dayIndex?: number;
  onCrossDayMove?: (sourceDay: number, targetDay: number, sourceIndex: number, targetIndex: number) => void;
}

export function ArrangeItems<T>({
  items,
  renderItem,
  onReorder,
  onDelete,
  itemClassName = "",
  dragHandleClassName = "",
  dayIndex,
  onCrossDayMove
}: ArrangeItemsProps<T>) {
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ 
      index,
      dayIndex: dayIndex
    }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    const sourceIndex = data.index;
    const sourceDayIndex = data.dayIndex;

    // If we're moving within the same day
    if (sourceDayIndex === dayIndex) {
      if (sourceIndex === targetIndex) {
        return;
      }
      onReorder(sourceIndex, targetIndex);
    } 
    // If we're moving between different days and onCrossDayMove is provided
    else if (dayIndex !== undefined && sourceDayIndex !== undefined && onCrossDayMove) {
      onCrossDayMove(sourceDayIndex, dayIndex, sourceIndex, targetIndex);
    }
  };

  return (
    <div className="space-y-1">
      {items.map((item, index) => (
        <div
          key={index}
          className={`flex items-start py-0.5 ${itemClassName}`}
          draggable="true"
          style={{ position: 'relative' }}
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, index)}
        >
          <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0" />
          <div className={`flex-1 group ${index === 0 ? 'bg-[#669BBC]/10 border border-[#5f9585]/30' : 'hover:bg-[#669BBC]/10'} rounded-md p-2 transition-colors`}>
            <div className="flex items-center gap-2">
              {renderItem(item, index)}
              <div className={`flex items-center gap-1 ${index === 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                <MoveVertical className={`w-4 h-4 text-gray-400 cursor-move ${dragHandleClassName}`} />
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => onDelete(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete item</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}