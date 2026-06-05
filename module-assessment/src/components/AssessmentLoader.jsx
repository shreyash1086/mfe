import React from 'react';

const AssessmentLoader = ({ text = "Loading Assessment Data...", scale = 1 }) => {
    return (
        <div className="flex flex-col items-center justify-center w-full h-full" style={{ transform: `scale(${scale})` }}>
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <span className="font-semibold tracking-wider text-base text-gray-700 dark:text-gray-200 whitespace-nowrap">
                {text}
            </span>
        </div>
    );
};

export default AssessmentLoader;
