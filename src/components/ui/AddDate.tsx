import { useState } from 'react';
import { Button } from './button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';

interface AddDateProps {
  language: string;
  onDateSelected: (date: Date) => void;
  selectedDate?: Date;
}

export function AddDate({ language, onDateSelected, selectedDate }: AddDateProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDateSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(event.target.value);
    onDateSelected(newDate);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full justify-start text-left font-semibold",
          !selectedDate && "text-muted-foreground"
        )}
      >
        <Calendar className="w-4 h-4 mr-2" />
        {selectedDate ? (
          format(selectedDate, 'PPP', { locale: language === 'fr' ? fr : undefined })
        ) : (
          <span>{language === 'fr' ? 'Choisir date Jour 1' : 'Pick a date for Day 1'}</span>
        )}
      </Button>
      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white border rounded-md shadow-lg p-2">
          <input
            type="date"
            min={new Date().toISOString().split('T')[0]}
            value={selectedDate?.toISOString().split('T')[0] || ''}
            onChange={handleDateSelect}
            className="w-full p-2 border rounded"
          />
        </div>
      )}
    </div>
  );
}