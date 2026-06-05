import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import { ASSESSMENT_API_BASE_URL } from '../api';
import { useTheme } from '../ThemeContext';

function AssessmentMCQ() {
    const navigate = useNavigate();
    const { darkMode, toggleTheme } = useTheme();
    const [file, setFile] = useState(null);
    const [datasetName, setDatasetName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState({ total: 0, current: 0, success: 0, errors: 0 });
    const [logs, setLogs] = useState([]);

    const breadcrumbItems = [
        { label: 'Assessment', path: '/assessment', className: 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400' },
        { label: 'Upload MCQ CSV', className: 'text-gray-900 dark:text-white font-medium' }
    ];

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setLogs([]);
            setProgress({ total: 0, current: 0, success: 0, errors: 0 });
        }
    };

    const handleUpload = async () => {
        if (!file) {
            alert('Please select a CSV file.');
            return;
        }
        if (!datasetName.trim()) {
            alert('Please enter a Dataset Name.');
            return;
        }

        setUploading(true);
        setLogs([]);

        const formData = new FormData();
        formData.append('dataset', file);
        formData.append('datasetName', datasetName);
        formData.append('description', 'Uploaded via Admin Console');

        try {
            // Use server-side upload endpoint
            const response = await fetch(`${ASSESSMENT_API_BASE_URL}/challenges/mcq/upload`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Upload successful:', data);
                setProgress({ total: data.count, current: data.count, success: data.count, errors: 0 });
                alert(`Dataset "${datasetName}" uploaded successfully with ${data.count} questions!`);
                navigate('/assessment');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message);
            }
        } catch (error) {
            console.error('Upload Error:', error);
            alert(`Upload Failed: ${error.message}`);
            setLogs(prev => [...prev, error.message]);
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadSample = () => {
        const csvContent =
            `Question,Description,A,B,C,D,Correct,Difficulty,Points
What does HTML stand for?,This question tests your basic knowledge of web markup languages.,Hyperlink and Text Markup Language,Hyper Text Markup Language,Home Tool Markup Language,Hyper Text Multiple Language,B,Easy,2
Which CSS property controls the text size?,Choose the correct property name used in standard CSS stylesheets.,font-style,text-size,font-size,text-style,C,Easy,2
What is the correct JavaScript syntax to change the content of the HTML element below: <p id="demo">This is a demonstration.</p>?,Select the correct DOM manipulation syntax.,document.getElementByName("p").innerHTML = "Hello World!";,document.getElementById("demo").innerHTML = "Hello World!";,#demo.innerHTML = "Hello World!";,document.getElement("p").innerHTML = "Hello World!";,B,Medium,5
Which of the following is NOT a JavaScript data type?,JavaScript has primitive data types and object types. Identify the one that is invalid.,String,Boolean,Float,Undefined,C,Medium,3
How do you write a conditional statement for executing some code if "i" is not equal to 5?,Select the correct JavaScript comparison syntax.,if (i <> 5),if i =! 5 then,if (i != 5),if i <> 5,C,Hard,5`;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'sample_mcq_format.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-gray-50 dark:bg-black text-gray-800 dark:text-gray-100 font-['Poppins',sans-serif] transition-colors duration-500">
            <div className="px-6 pt-6 pb-3 w-full flex-1 flex flex-col mx-auto">

                {/* Header Area - Pill Style */}
                <div className="w-full bg-white dark:bg-black rounded-[28px] px-8 py-3.5 flex items-center shadow-sm border border-gray-100 dark:border-blue-500/10 transition-all hover:shadow-md dark:hover:border-blue-500/30 mb-6 shrink-0">
                    <div className="flex items-center">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-none px-4 whitespace-nowrap">
                            Upload MCQ CSV
                        </h1>
                        <div className="h-6 w-[1px] bg-gray-100 dark:bg-white/10 mx-2" />
                        <div className="px-2">
                            <Breadcrumbs items={breadcrumbItems} transparent={true} className="mb-0" />
                        </div>
                    </div>

                    <div className="flex-1 px-4" />

                    <div className="flex items-center gap-3 pl-4 border-l border-gray-100 dark:border-white/10">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-xl transition-all duration-300 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            aria-label="Toggle Theme"
                        >
                            <span className="material-symbols-outlined text-[20px] font-variation-settings-fill">
                                {darkMode ? 'light_mode' : 'dark_mode'}
                            </span>
                        </button>
                    </div>

                    <div className="h-8 w-[1px] bg-gray-100 dark:bg-white/10 mx-2" />

                    <div className="pl-4">
                        <button
                            onClick={() => navigate('/assessment/available-mcq-datasets')}
                            className="h-11 px-6 bg-gray-100 dark:bg-transparent border border-transparent dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-[12px] font-bold uppercase tracking-wider rounded-2xl flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap"
                        >
                            <span className="material-symbols-outlined text-[20px]">format_list_bulleted</span>
                            Available Datasets
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="w-full h-full">

                        <div className="space-y-6">

                            {/* Dataset Name Input */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    Dataset Name <span className="text-blue-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={datasetName}
                                    onChange={(e) => setDatasetName(e.target.value)}
                                    placeholder="e.g., Python Basics Q1"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-500 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">This name will be used to group these questions.</p>
                            </div>

                            {/* Info Banner & Dummy Dataset */}
                            <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                                <div className="p-4 bg-gray-50 dark:bg-black/40 border-b border-gray-200 dark:border-white/10 flex items-start gap-3">
                                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 mt-0.5">info</span>
                                    <div className="flex items-center justify-between w-full">
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Required CSV Format</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                Please format your CSV file exactly as shown below. The first row MUST be the headers.
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleDownloadSample}
                                            className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">download</span>
                                            Download Sample CSV
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                                        <thead>
                                            <tr className="bg-gray-100/50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-mono">
                                                <th className="px-4 py-3 font-semibold">Question</th>
                                                <th className="px-4 py-3 font-semibold text-gray-400">Description (Optional)</th>
                                                <th className="px-4 py-3 font-semibold">A</th>
                                                <th className="px-4 py-3 font-semibold">B</th>
                                                <th className="px-4 py-3 font-semibold">C</th>
                                                <th className="px-4 py-3 font-semibold">D</th>
                                                <th className="px-4 py-3 font-semibold">Correct</th>
                                                <th className="px-4 py-3 font-semibold text-gray-400">Difficulty (Optional)</th>
                                                <th className="px-4 py-3 font-semibold text-gray-400">Points (Optional)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-gray-700 dark:text-gray-300">
                                            <tr className="hover:bg-gray-50 dark:hover:bg-white/5">
                                                <td className="px-4 py-2">What does HTML stand for?</td>
                                                <td className="px-4 py-2 italic text-gray-400">Used for creating web pages.</td>
                                                <td className="px-4 py-2">Hyperlinks and Text...</td>
                                                <td className="px-4 py-2">Hyper Text Markup...</td>
                                                <td className="px-4 py-2">Home Tool Markup...</td>
                                                <td className="px-4 py-2">Hyper Text Multiple...</td>
                                                <td className="px-4 py-2 font-bold text-green-600 dark:text-green-400">B</td>
                                                <td className="px-4 py-2">Easy</td>
                                                <td className="px-4 py-2">2</td>
                                            </tr>
                                            <tr className="hover:bg-gray-50 dark:hover:bg-white/5 bg-gray-50/30 dark:bg-white/5">
                                                <td className="px-4 py-2">Inside which HTML element...</td>
                                                <td className="px-4 py-2 italic text-gray-400"></td>
                                                <td className="px-4 py-2">&lt;javascript&gt;</td>
                                                <td className="px-4 py-2">&lt;scripting&gt;</td>
                                                <td className="px-4 py-2">&lt;script&gt;</td>
                                                <td className="px-4 py-2">&lt;js&gt;</td>
                                                <td className="px-4 py-2 font-bold text-green-600 dark:text-green-400">C</td>
                                                <td className="px-4 py-2">Medium</td>
                                                <td className="px-4 py-2">5</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* File Upload Area */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    Upload CSV File <span className="text-blue-500">*</span>
                                </label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-colors bg-transparent group relative">
                                    <div className="space-y-1 text-center relative z-10">
                                        <span className="material-symbols-outlined text-4xl text-gray-400 group-hover:text-blue-500 transition-colors">upload_file</span>
                                        <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-transparent rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                                <span>Upload a file</span>
                                                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".csv" onChange={handleFileChange} />
                                            </label>
                                            <p className="pl-1">or drag and drop</p>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            CSV file only
                                        </p>
                                        {file && (
                                            <div className="mt-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center text-blue-700 dark:text-blue-300 text-sm font-medium">
                                                <span className="material-symbols-outlined text-lg mr-2">description</span>
                                                {file.name}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Progress & Logs */}
                            {(uploading || progress.total > 0) && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                        <span>Progress</span>
                                        <span>{progress.current} / {progress.total}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2.5">
                                        <div
                                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex gap-4 text-xs">
                                        <span className="text-green-600">Success: {progress.success}</span>
                                        <span className="text-red-500">Errors: {progress.errors}</span>
                                    </div>
                                    {logs.length > 0 && (
                                        <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg text-xs text-red-600 font-mono max-h-32 overflow-y-auto">
                                            {logs.map((log, i) => <div key={i}>{log}</div>)}
                                        </div>
                                    )}
                                </div>
                            )}

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
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined mr-2 text-lg">upload</span>
                                        Start Upload
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

export default AssessmentMCQ;
