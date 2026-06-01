import React from 'react';
import { Link } from 'react-router-dom';

const Breadcrumbs = ({ items, className = '', transparent = false }) => {
    return (
        <nav className={`flex ${className || 'mb-2'}`} aria-label="Breadcrumb">
            <ol className={`inline-flex items-center space-x-1 md:space-x-2 transition-colors duration-300 ${transparent ? 'bg-transparent px-0 py-0 border-none' : 'bg-white dark:bg-brand-card px-4 py-2 rounded-lg shadow-sm border-gray-100 dark:border-gray-700'}`}>
                <li className="inline-flex items-center">
                    <Link
                        to="/dashboard"
                        className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg !leading-none">home</span>
                    </Link>
                </li>
                {items.map((item, index) => (
                    <li key={index}>
                        <div className="flex items-center">
                            <span className="material-symbols-outlined text-gray-400 text-lg mx-1 !leading-none">chevron_right</span>
                            {item.path ? (
                                <Link
                                    to={item.path}
                                    className="text-sm font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                                >
                                    {item.label}
                                </Link>
                            ) : item.onClick ? (
                                <button
                                    onClick={item.onClick}
                                    className="text-sm font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors cursor-pointer bg-transparent border-none p-0"
                                >
                                    {item.label}
                                </button>
                            ) : (
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md">
                                    {item.label}
                                </span>
                            )}
                        </div>
                    </li>
                ))}
            </ol>
        </nav>
    );
};

export default Breadcrumbs;
