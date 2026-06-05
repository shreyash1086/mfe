import React, { useState, useEffect, useRef } from 'react';

const CustomTimePicker = ({ label, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedHour, setSelectedHour] = useState('12');
    const [selectedMinute, setSelectedMinute] = useState('00');
    const containerRef = useRef(null);

    // Parse value on mount or change
    useEffect(() => {
        if (value) {
            const [h, m] = value.split(':');
            if (h && m) {
                setSelectedHour(h);
                setSelectedMinute(m);
            }
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

    const handleTimeSelect = (type, val) => {
        let newH = selectedHour;
        let newM = selectedMinute;

        if (type === 'hour') {
            newH = val;
            setSelectedHour(val);
        } else {
            newM = val;
            setSelectedMinute(val);
        }

        const newValue = `${newH}:${newM}`;
        onChange({ target: { value: newValue } }); // Mimic event object for compatibility
    };

    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

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
                <span className={`${value ? '' : 'text-gray-400'}`}>
                    {value || '--:--'}
                </span>
                <span className="material-symbols-outlined text-gray-500 dark:text-gray-400 text-xl">
                    schedule
                </span>
            </div>

            {isOpen && (
                <div className={`absolute z-50 mt-2 p-2 rounded-xl shadow-xl w-48 left-0 sm:left-auto
                    bg-white border-gray-200
                    dark:bg-gray-900/90 dark:backdrop-blur-3xl dark:border dark:border-white/10 dark:shadow-2xl dark:shadow-black/50 
                    overflow-y-auto h-60 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600`}>

                    <div className="flex min-h-full">
                        {/* Hours Column */}
                        <div className="flex-1 pr-1">
                            <div className="text-xs font-semibold text-center text-gray-500 mb-1 sticky top-0 bg-white dark:bg-gray-900/90 py-1 z-10">Hrs</div>
                            {hours.map(h => (
                                <button
                                    key={h}
                                    onClick={() => handleTimeSelect('hour', h)}
                                    className={`w-full text-center py-1.5 text-sm rounded mb-1 transition-colors
                                        ${selectedHour === h
                                            ? 'bg-red-500 text-white'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                                        }`}
                                >
                                    {h}
                                </button>
                            ))}
                        </div>

                        {/* Separator */}
                        <div className="w-[1px] bg-gray-200 dark:bg-white/10 mx-1 my-2"></div>

                        {/* Minutes Column */}
                        <div className="flex-1 pl-1">
                            <div className="text-xs font-semibold text-center text-gray-500 mb-1 sticky top-0 bg-white dark:bg-gray-900/90 py-1 z-10">Min</div>
                            {minutes.map(m => (
                                <button
                                    key={m}
                                    onClick={() => handleTimeSelect('minute', m)}
                                    className={`w-full text-center py-1.5 text-sm rounded mb-1 transition-colors
                                        ${selectedMinute === m
                                            ? 'bg-red-500 text-white'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                                        }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomTimePicker;
