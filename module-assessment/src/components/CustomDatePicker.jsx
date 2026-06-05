import React, { useState, useEffect, useRef } from 'react';

const CustomDatePicker = ({ label, value, onChange, minDate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentDate, setCurrentDate] = useState(value ? new Date(value) : new Date());
    const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
    const containerRef = useRef(null);

    const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    useEffect(() => {
        if (value) {
            const date = new Date(value);
            setSelectedDate(date);
            setCurrentDate(date);
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month, 1).getDay();
    };

    const handleDateClick = (day) => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const offset = newDate.getTimezoneOffset();
        const adjustedDate = new Date(newDate.getTime() - (offset * 60 * 1000));

        setSelectedDate(newDate);
        onChange(adjustedDate.toISOString().split('T')[0]);
        setIsOpen(false);
    };

    const changeMonth = (offset) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    const changeYear = (event) => {
        const newYear = parseInt(event.target.value);
        setCurrentDate(new Date(newYear, currentDate.getMonth(), 1));
    };

    const changeMonthSelect = (event) => {
        const newMonth = months.indexOf(event.target.value);
        setCurrentDate(new Date(currentDate.getFullYear(), newMonth, 1));
    };

    const formatDateDisplay = (date) => {
        if (!date) return 'dd-mm-yyyy';
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const y = date.getFullYear();
        return `${d}-${m}-${y}`;
    };

    return (
        <div className="relative" ref={containerRef}>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {label}
            </label>

            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-2.5 border rounded-lg flex items-center justify-between cursor-pointer transition-colors
                    bg-white border-gray-300 text-gray-900
                    dark:bg-gray-800/40 dark:backdrop-blur-md dark:border-gray-600 dark:text-gray-100
                    hover:border-red-500 dark:hover:border-gray-500`}
            >
                <span className={`${selectedDate ? '' : 'text-gray-400'}`}>
                    {selectedDate ? formatDateDisplay(selectedDate) : 'dd-mm-yyyy'}
                </span>
                <span className="material-symbols-outlined text-gray-500 dark:text-gray-400 text-xl">
                    calendar_today
                </span>
            </div>

            {isOpen && (
                <div className={`absolute z-50 mt-2 p-4 rounded-xl shadow-xl w-72 left-0 sm:left-auto
                    bg-white border-gray-200
                    dark:bg-gray-900/90 dark:backdrop-blur-3xl dark:border dark:border-white/10 dark:shadow-2xl dark:shadow-black/50`}>

                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                            <span className="material-symbols-outlined text-gray-600 dark:text-gray-300 text-sm">chevron_left</span>
                        </button>

                        <div className="flex gap-1">
                            <select
                                value={months[currentDate.getMonth()]}
                                onChange={changeMonthSelect}
                                className="bg-transparent text-sm font-semibold text-gray-800 dark:text-gray-100 cursor-pointer focus:outline-none appearance-none hover:text-red-500 transition-colors"
                            >
                                {months.map(m => <option key={m} value={m} className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">{m}</option>)}
                            </select>

                            <select
                                value={currentDate.getFullYear() || new Date().getFullYear()}
                                onChange={changeYear}
                                className="bg-transparent text-sm font-semibold text-gray-800 dark:text-gray-100 cursor-pointer focus:outline-none appearance-none hover:text-red-500 transition-colors"
                            >
                                {Array.from({ length: 10 }, (_, i) => (currentDate.getFullYear() || new Date().getFullYear()) - 5 + i).map(y => (
                                    <option key={y} value={y} className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">{y}</option>
                                ))}
                            </select>
                        </div>

                        <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                            <span className="material-symbols-outlined text-gray-600 dark:text-gray-300 text-sm">chevron_right</span>
                        </button>
                    </div>

                    {/* Week Days */}
                    <div className="grid grid-cols-7 mb-2">
                        {daysOfWeek.map(day => (
                            <div key={day} className="text-center text-xs text-gray-500 dark:text-gray-500 font-medium py-1">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: getFirstDayOfMonth(currentDate) }).map((_, i) => (
                            <div key={`empty-${i}`} className="h-8 w-8" />
                        ))}

                        {Array.from({ length: getDaysInMonth(currentDate) }).map((_, i) => {
                            const day = i + 1;
                            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                            const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                            const isToday = new Date().toDateString() === date.toDateString();

                            return (
                                <button
                                    key={day}
                                    onClick={() => handleDateClick(day)}
                                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs transition-all relative
                                        ${isSelected
                                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                                        }
                                        ${isToday && !isSelected ? 'border border-red-500 text-red-500' : ''}
                                    `}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex justify-between mt-4 py-2 border-t border-gray-100 dark:border-white/10">
                        <button
                            onClick={() => { setSelectedDate(null); onChange(''); setIsOpen(false); }}
                            className="text-xs text-red-500 hover:text-red-600 font-medium"
                        >
                            Clear
                        </button>
                        <button
                            onClick={() => {
                                const today = new Date();
                                setSelectedDate(today);
                                onChange(today.toISOString().split('T')[0]);
                                setIsOpen(false);
                            }}
                            className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                        >
                            Today
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomDatePicker;
