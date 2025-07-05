import React, { useState, useMemo } from 'react';
import { holidays, getHolidaysForDate, Holiday } from '../data/holidays';

interface Deal {
  id: string;
  name: string;
  headline: string;
  buttonText: string;
  pills: string[];
  isActive: boolean;
  orderDetails: {
    material: string;
    size: string;
    quantity: number;
    price: number;
  };
  startDate?: string;
  endDate?: string;
  isScheduled?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DealCalendarProps {
  deals: Deal[];
  onDateClick: (date: string) => void;
  onDealClick: (deal: Deal) => void;
  selectedDate?: string;
}

const DealCalendar: React.FC<DealCalendarProps> = ({
  deals,
  onDateClick,
  onDealClick,
  selectedDate
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Get calendar data for current month
  const calendarData = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay())); // End on Saturday
    
    const days = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const isCurrentMonth = current.getMonth() === currentMonth;
      // Get today's date in local timezone (Mountain Time)
      const today = new Date();
      const localDateStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      const isToday = dateStr === localDateStr;
      const isSelected = dateStr === selectedDate;
      
      // Get holidays for this date
      const dayHolidays = getHolidaysForDate(dateStr);
      
      // Get deals for this date
      const dayDeals = deals.filter(deal => {
        if (!deal.startDate || !deal.endDate) return false;
        return dateStr >= deal.startDate && dateStr <= deal.endDate;
      });
      
      days.push({
        date: new Date(current),
        dateStr,
        day: current.getDate(),
        isCurrentMonth,
        isToday,
        isSelected,
        holidays: dayHolidays,
        deals: dayDeals
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentYear, currentMonth, deals, selectedDate]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div
      className="p-6 rounded-xl"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
        backdropFilter: 'blur(12px)'
      }}
    >
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">
          📅 Deal Calendar
        </h3>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            ←
          </button>
          <span className="text-lg font-medium text-white min-w-[140px] text-center">
            {monthNames[currentMonth]} {currentYear}
          </span>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            →
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {dayNames.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-400">
            {day}
          </div>
        ))}
        
        {/* Calendar Days */}
        {calendarData.map((day, index) => (
          <div
            key={index}
            onClick={() => onDateClick(day.dateStr)}
            className={`
              min-h-[100px] p-2 border border-gray-700/50 cursor-pointer transition-all hover:bg-gray-800/50 relative
              ${day.isCurrentMonth ? 'bg-gray-900/30' : 'bg-gray-900/10'}
              ${day.isToday ? 'ring-2 ring-blue-500' : ''}
              ${day.isSelected ? 'bg-blue-900/50' : ''}
            `}
          >
            {/* Day Number */}
            <div className={`text-sm font-medium mb-1 ${
              day.isCurrentMonth ? 'text-white' : 'text-gray-500'
            }`}>
              {day.day}
            </div>
            
            {/* Holidays */}
            {day.holidays.map((holiday, idx) => (
              <div
                key={idx}
                className="text-xs mb-1 px-1 py-0.5 rounded truncate"
                style={{ backgroundColor: holiday.color + '20', color: holiday.color }}
                title={holiday.description}
              >
                {holiday.emoji} {holiday.name}
              </div>
            ))}
            
            {/* Deals */}
            {day.deals.map((deal, idx) => (
              <div
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  onDealClick(deal);
                }}
                className={`
                  text-xs mb-1 px-1 py-0.5 rounded truncate cursor-pointer transition-all hover:scale-105
                  ${deal.isActive 
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                    : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                  }
                `}
                title={`${deal.name} - $${deal.orderDetails.price}`}
              >
                💰 {deal.name}
              </div>
            ))}
            
            {/* Add Deal Button (only for current month dates) */}
            {day.isCurrentMonth && day.deals.length === 0 && day.holidays.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDateClick(day.dateStr);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  + Deal
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-700/50">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500/20 border border-green-500/30 rounded"></div>
            <span className="text-gray-300">Active Deal</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-500/20 border border-gray-500/30 rounded"></div>
            <span className="text-gray-300">Inactive Deal</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500/20 border border-red-500/30 rounded"></div>
            <span className="text-gray-300">Major Holiday</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500/20 border border-blue-500/30 rounded"></div>
            <span className="text-gray-300">Selected Date</span>
          </div>
        </div>
      </div>

      {/* Holiday Summary for Current Month */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-300 mb-3">
          Upcoming Holidays in {monthNames[currentMonth]}
        </h4>
        <div className="space-y-2">
          {holidays
            .filter(holiday => {
              const holidayDate = new Date(holiday.date);
              return holidayDate.getMonth() === currentMonth && holidayDate.getFullYear() === currentYear;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map((holiday, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-gray-800/30 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{holiday.emoji}</span>
                  <div>
                    <div className="text-sm font-medium text-white">{holiday.name}</div>
                    <div className="text-xs text-gray-400">{holiday.description}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(holiday.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};

export default DealCalendar; 