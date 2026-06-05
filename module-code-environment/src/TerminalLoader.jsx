import React from 'react';

const TerminalLoader = () => {
    return (
        <div className="flex justify-center w-full py-4">
            <style>
                {`
                @keyframes typeAndDelete {
                    0%, 10% { width: 0; }
                    45%, 55% { width: 8.5em; } /* adjusted for "Kode Env..." */
                    90%, 100% { width: 0; }
                }

                @keyframes blinkCursor {
                    0%, 100% { border-right-color: transparent; }
                    50% { border-right-color: #3b82f6; } /* Tailwind blue-500 */
                }

                .kode-loader-box {
                    width: 16rem;
                    background-color: #0f172a; /* slate-900 */
                    border-radius: 0.75rem; /* rounded-xl */
                    overflow: hidden;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .kode-loader-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.75rem 1rem;
                    background-color: #1e293b; /* slate-800 */
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }

                .kode-loader-controls {
                    display: flex;
                    gap: 0.375rem;
                }

                .kode-loader-control {
                    width: 0.75rem;
                    height: 0.75rem;
                    border-radius: 9999px;
                }

                .kode-control-close { background-color: #ef4444; } /* red-500 */
                .kode-control-minimize { background-color: #eab308; } /* yellow-500 */
                .kode-control-maximize { background-color: #22c55e; } /* green-500 */

                .kode-loader-title {
                    color: #94a3b8; /* slate-400 */
                    font-size: 0.75rem;
                    font-weight: 500;
                    letter-spacing: 0.05em;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                }

                .kode-loader-body {
                    padding: 1.5rem 1.25rem;
                    background-color: #0f172a;
                }

                .kode-loader-text-wrapper {
                    display: flex;
                    align-items: center;
                    color: #e2e8f0; /* slate-200 */
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                    font-size: 0.875rem;
                }

                .kode-loader-prompt {
                    color: #3b82f6; /* blue-500 */
                    margin-right: 0.5rem;
                    font-weight: 700;
                }

                .kode-loader-text {
                    display: inline-block;
                    white-space: nowrap;
                    overflow: hidden;
                    border-right: 2px solid #3b82f6; /* blue-500 cursor */
                    animation: typeAndDelete 4s steps(15) infinite, blinkCursor 0.75s step-end infinite;
                }
                `}
            </style>

            <div className="kode-loader-box">
                <div className="kode-loader-header">
                    <div className="kode-loader-controls">
                        <div className="kode-loader-control kode-control-close" />
                        <div className="kode-loader-control kode-control-minimize" />
                        <div className="kode-loader-control kode-control-maximize" />
                    </div>
                    <div className="kode-loader-title">ZSH - Kode Env</div>
                </div>
                <div className="kode-loader-body">
                    <div className="kode-loader-text-wrapper">
                        <span className="kode-loader-prompt">~%</span>
                        <div className="kode-loader-text">Kode Env...</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TerminalLoader;
