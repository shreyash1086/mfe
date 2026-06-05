import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import Breadcrumbs from '../components/Breadcrumbs';
import { ASSESSMENT_API_BASE_URL } from '../api';

function AssessmentDatasets() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [file, setFile] = useState(null);
    const [questionsFile, setQuestionsFile] = useState(null);
    const [description, setDescription] = useState('');
    const [uploading, setUploading] = useState(false);

    const breadcrumbItems = [
        { label: 'Assessment', path: '/assessment' },
        { label: 'Upload SQL DB' }
    ];

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleQuestionsFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setQuestionsFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            alert('Please select a ZIP file.');
            return;
        }

        if (!description || description.trim() === '') {
            alert('Description is mandatory. Please provide brief details about the dataset.');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('dataset', file);
        if (questionsFile) {
            formData.append('questions', questionsFile);
        }
        // Name is handled by backend from filename
        formData.append('description', description);

        try {
            const response = await fetch(`${ASSESSMENT_API_BASE_URL}/challenges/databases/upload`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Upload successful:', data);
                alert(`Database "${data.name}" Created Successfully!`);
                navigate('/assessment/available-databases');
            } else {
                const errorData = await response.json();
                alert(`Upload failed: ${errorData.message} `);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('An error occurred during upload.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-gray-50 dark:bg-black text-gray-800 dark:text-gray-100 font-['Poppins',sans-serif] transition-colors duration-500">
            <div className="px-6 pt-6 pb-3 w-full flex-1 flex flex-col mx-auto">

                {/* Header Area - Pill Style */}
                <div className="w-full bg-white dark:bg-black rounded-[28px] px-8 py-3.5 flex items-center shadow-sm border border-gray-100 dark:border-blue-500/10 transition-all hover:shadow-md dark:hover:border-blue-500/30 mb-6 shrink-0">
                    <div className="flex items-center">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-none px-4 whitespace-nowrap">
                            SQL Datasets
                        </h1>
                        <div className="h-6 w-[1px] bg-gray-100 dark:bg-white/10 mx-2" />
                        <div className="px-2">
                            <Breadcrumbs items={breadcrumbItems} transparent={true} className="mb-0" />
                        </div>
                    </div>

                    <div className="h-8 w-[1px] bg-gray-100 dark:bg-white/10 mx-4" />

                    <div className="flex-1 px-4" />

                    <div className="flex items-center gap-1.5 px-6">
                        <button onClick={toggleTheme} className="w-10 h-10 rounded-xl text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-all flex items-center justify-center pt-0.5" title="Toggle Theme">
                            <span className="material-symbols-outlined text-[22px]">
                                {theme === 'dark' ? 'dark_mode' : 'light_mode'}
                            </span>
                        </button>
                    </div>

                    <div className="h-8 w-[1px] bg-gray-100 dark:bg-white/10 mx-2" />

                    <div className="pl-4">
                        <button
                            onClick={() => navigate('/assessment/available-databases')}
                            className="h-11 px-6 bg-gray-100 dark:bg-transparent border border-transparent dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-[12px] font-bold uppercase tracking-wider rounded-2xl flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap"
                        >
                            <span className="material-symbols-outlined text-[20px]">database</span>
                            Available DBs
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="w-full h-full">

                        <div className="space-y-6">

                            {/* Info Banner */}
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl flex items-start">
                                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 mr-3 mt-0.5">info</span>
                                <div className="text-sm text-blue-800 dark:text-blue-200">
                                    <p className="font-semibold mb-1">Naming Convention</p>
                                    The database name will be automatically generated from your ZIP filename. Ensure your file is named correctly (e.g., <code>Retail_DB_v1.zip</code>).
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    Description <span className="text-red-500 font-black">*</span>
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Brief details about the dataset schema or contents. (Mandatory)"
                                    rows="3"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-500 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                />
                            </div>

                            {/* Side-by-Side Uploads with download links above each */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* ZIP Upload + Download Template */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                            Upload ZIP File <span className="text-blue-500 font-black">*</span>
                                        </label>
                                        <a
                                            href="/sql_db_template.zip"
                                            download="sql_db_template.zip"
                                            className="flex items-center gap-1.5 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">folder_zip</span>
                                            Download DB Template
                                        </a>
                                    </div>
                                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-colors bg-transparent group relative h-48">
                                        <div className="space-y-1 text-center relative z-10 flex flex-col justify-center h-full w-full">
                                            <span className="material-symbols-outlined text-4xl text-gray-400 group-hover:text-blue-500 transition-colors">folder_zip</span>
                                            <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                                                <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-transparent rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                                    <span>Upload a file</span>
                                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".zip" onChange={handleFileChange} />
                                                </label>
                                                <p className="pl-1">or drag and drop</p>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                ZIP archive (max 50MB)
                                            </p>
                                            {file && (
                                                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center text-blue-700 dark:text-blue-300 text-sm font-medium">
                                                    <span className="material-symbols-outlined text-lg mr-2">description</span>
                                                    {file.name}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* CSV Upload + Download Question Sample */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                            Upload SQL Questions (CSV)
                                        </label>
                                        <a
                                            href="/sql_questions_sample.csv"
                                            download
                                            className="flex items-center gap-1.5 text-[11px] font-bold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">download</span>
                                            Download Question Sample
                                        </a>
                                    </div>
                                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-xl hover:border-green-500 dark:hover:border-green-500 transition-colors bg-transparent group relative h-48">
                                        <div className="space-y-1 text-center relative z-10 flex flex-col justify-center h-full w-full">
                                            <span className="material-symbols-outlined text-4xl text-gray-400 group-hover:text-green-500 transition-colors">description</span>
                                            <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                                                <label htmlFor="questions-upload" className="relative cursor-pointer bg-white dark:bg-transparent rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500">
                                                    <span>Upload a CSV</span>
                                                    <input id="questions-upload" name="questions-upload" type="file" className="sr-only" accept=".csv" onChange={handleQuestionsFileChange} />
                                                </label>
                                                <p className="pl-1">or drag and drop</p>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                CSV file containing questions
                                            </p>
                                            {questionsFile && (
                                                <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center text-green-700 dark:text-green-300 text-sm font-medium">
                                                    <span className="material-symbols-outlined text-lg mr-2">check_circle</span>
                                                    {questionsFile.name}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-8 flex justify-end gap-3">
                            <button
                                onClick={() => navigate('/assessment')}
                                className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-transparent border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={uploading}
                                className={`px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all flex items-center ${uploading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {uploading ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin mr-2 text-lg">progress_activity</span>
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined mr-2 text-lg">upload</span>
                                        Upload Database
                                    </>
                                )}
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

export default AssessmentDatasets;
