import React, { useState, useEffect, useRef } from 'react';

const MultiSelect = ({ label, options, selectedValues, onChange, placeholder = "Select Items", searchable = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setTimeout(() => setSearchTerm(''), 200); // Clear search after closing
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (value) => {
        console.log('[MultiSelect] toggleOption called with value:', value);
        console.log('[MultiSelect] Current selectedValues:', selectedValues);

        let newValues;
        if (selectedValues.includes(value)) {
            newValues = selectedValues.filter(v => v !== value);
        } else {
            newValues = [...selectedValues, value];
        }

        console.log('[MultiSelect] New values:', newValues);
        onChange(newValues);
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            onChange(options.map(opt => opt.value));
        } else {
            onChange([]);
        }
    };

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const displayText = selectedValues.length > 0
        ? `${selectedValues.length} selected`
        : placeholder;

    return (
        <div className="relative" ref={containerRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {label}
                </label>
            )}

            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all
                    ${isOpen ? 'ring-2 ring-blue-500/50 border-blue-500/50' : 'border-gray-200 dark:border-white/10'}
                    bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-white
                `}
            >
                <div className="flex gap-2 items-center overflow-hidden">
                    <span className={selectedValues.length === 0 ? 'text-gray-400' : ''}>
                        {selectedValues.length > 0
                            ? options.filter(o => selectedValues.includes(o.value)).map(o => o.label).join(', ').substring(0, 30) + (options.filter(o => selectedValues.includes(o.value)).map(o => o.label).join(', ').length > 30 ? '...' : '')
                            : placeholder
                        }
                    </span>
                    {selectedValues.length > 0 && (
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                            {selectedValues.length}
                        </span>
                    )}
                </div>
                <span className="material-symbols-outlined text-gray-400 text-lg">
                    expand_more
                </span>
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-2 w-full max-h-60 overflow-y-auto rounded-xl shadow-xl shadow-black/10 
                    bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 p-2 flex flex-col">

                    {searchable && (
                        <div className="p-2 border-b border-gray-100 dark:border-white/5 sticky top-0 bg-white dark:bg-[#1a1a1a] z-10 -mt-2 -mx-2 mb-2">
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
                                <input
                                    type="text"
                                    className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>
                    )}

                    {filteredOptions.length > 0 && options.length > 0 && (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                const allFilteredSelected = filteredOptions.every(o => selectedValues.includes(o.value));

                                if (allFilteredSelected) {
                                    const newValues = selectedValues.filter(v => !filteredOptions.some(fo => fo.value === v));
                                    onChange(newValues);
                                } else {
                                    const newValues = [...new Set([...selectedValues, ...filteredOptions.map(o => o.value)])];
                                    onChange(newValues);
                                }
                            }}
                            className="flex items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer text-sm font-semibold text-blue-500 mb-2 border-b border-gray-100 dark:border-white/5"
                        >
                            {filteredOptions.every(o => selectedValues.includes(o.value)) ? 'Deselect Visible' : 'Select Visible'}
                        </div>
                    )}

                    {filteredOptions.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-400">
                            {options.length === 0 ? "No options available" : "No matches found"}
                        </div>
                    ) : (
                        filteredOptions.map((option, index) => (
                            <div
                                onClick={() => toggleOption(option.value)}
                                className="flex items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                                key={`${option.value}-${index}`}
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center mr-3 transition-colors shrink-0
                                    ${selectedValues.includes(option.value)
                                        ? 'bg-blue-500 border-blue-500'
                                        : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                >
                                    {selectedValues.includes(option.value) && (
                                        <span className="material-symbols-outlined text-[10px] text-white font-bold">check</span>
                                    )}
                                </div>
                                <span className="text-sm text-gray-700 dark:text-gray-200 truncate">
                                    {option.label}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default MultiSelect;
