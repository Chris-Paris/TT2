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
  startingIndex?: number;
}

export function ArrangeItems<T>({
  items,
  renderItem,
  onReorder,
  onDelete,
  itemClassName = "",
  dragHandleClassName = "",
  dayIndex,
  onCrossDayMove,
  startingIndex = 0
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
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={index}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, index)}
          className={`flex-1 group border border-[#5f9585]/30 rounded-md p-2 transition-colors relative ${itemClassName}`}
        >
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-100 transition-opacity z-10">
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
          
          {/* Activity number badge */}
          <div className="absolute top-2 left-2 text-xs font-medium px-2 py-1 rounded-full z-10 border border-[#003049]">
            {startingIndex + index + 1}
          </div>
          
          <div>{renderItem(item, index)}</div>
        </div>
      ))}
    </div>
  );
}