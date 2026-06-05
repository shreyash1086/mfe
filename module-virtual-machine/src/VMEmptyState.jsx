import React from "react";

const VMEmptyState = () => {
  return (
    <div className="flex flex-col items-center justify-center w-full py-20 relative overflow-hidden">
      <style>
        {`
                .idle-core-container {
                    position: relative;
                    width: 200px;
                    height: 200px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin-bottom: 32px;
                }

                .core-orb {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: radial-gradient(circle at 30% 30%, #60a5fa, #2563eb);
                    box-shadow: 
                        0 0 30px rgba(37, 99, 235, 0.4),
                        inset 0 0 20px rgba(255, 255, 255, 0.2);
                    position: relative;
                    z-index: 10;
                    animation: orb-breathe 4s ease-in-out infinite;
                }

                .dark .core-orb {
                    background: radial-gradient(circle at 30% 30%, #3b82f6, #1d4ed8);
                    box-shadow: 
                        0 0 40px rgba(29, 78, 216, 0.5),
                        inset 0 0 20px rgba(255, 255, 255, 0.1);
                }

                .ring-system {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    transform-style: preserve-3d;
                    perspective: 1000px;
                }

                .orbit-ring {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    border: 1px solid rgba(148, 163, 184, 0.3);
                    border-radius: 50%;
                    box-shadow: 0 0 10px rgba(148, 163, 184, 0.05);
                }

                .dark .orbit-ring {
                    border-color: rgba(255, 255, 255, 0.1);
                }

                .ring-1 {
                    width: 100px;
                    height: 100px;
                    animation: spin-tilt-1 8s linear infinite;
                    border-top-color: #3b82f6;
                    border-width: 2px;
                }

                .ring-2 {
                    width: 140px;
                    height: 140px;
                    animation: spin-tilt-2 12s linear infinite reverse;
                    border-right-color: #3563EB;
                    border-width: 1px;
                }

                .ring-3 {
                    width: 180px;
                    height: 180px;
                    animation: spin-tilt-3 20s linear infinite;
                    border-bottom-color: #8b5cf6;
                    border-style: dashed;
                }

                .satellite {
                    position: absolute;
                    top: 0;
                    left: 50%;
                    width: 6px;
                    height: 6px;
                    background: white;
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    box-shadow: 0 0 10px white;
                }

                .status-line {
                    position: absolute;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, #3b82f6, transparent);
                    width: 200px;
                    opacity: 0;
                    animation: scan-line 3s ease-in-out infinite;
                }

                @keyframes orb-breathe {
                    0%, 100% { transform: scale(1); opacity: 0.9; }
                    50% { transform: scale(1.05); opacity: 1; box-shadow: 0 0 50px rgba(37, 99, 235, 0.6); }
                }

                @keyframes spin-tilt-1 {
                    0% { transform: translate(-50%, -50%) rotateZ(0deg) rotateX(60deg) rotateY(10deg); }
                    100% { transform: translate(-50%, -50%) rotateZ(360deg) rotateX(60deg) rotateY(10deg); }
                }

                @keyframes spin-tilt-2 {
                    0% { transform: translate(-50%, -50%) rotateZ(0deg) rotateX(-45deg) rotateY(20deg); }
                    100% { transform: translate(-50%, -50%) rotateZ(360deg) rotateX(-45deg) rotateY(20deg); }
                }

                @keyframes spin-tilt-3 {
                    0% { transform: translate(-50%, -50%) rotateZ(0deg) rotateX(15deg) rotateY(-15deg); }
                    100% { transform: translate(-50%, -50%) rotateZ(360deg) rotateX(15deg) rotateY(-15deg); }
                }

                @keyframes scan-line {
                    0% { top: 20%; opacity: 0; width: 50px; }
                    50% { top: 50%; opacity: 0.5; width: 200px; }
                    100% { top: 80%; opacity: 0; width: 50px; }
                }
                `}
      </style>

      <div className="idle-core-container">
        <div className="status-line"></div>
        <div className="ring-system">
          <div className="orbit-ring ring-1">
            <div className="satellite"></div>
          </div>
          <div className="orbit-ring ring-2"></div>
          <div className="orbit-ring ring-3">
            <div
              className="satellite"
              style={{
                width: "4px",
                height: "4px",
                top: "100%",
                background: "#8b5cf6",
              }}
            ></div>
          </div>
        </div>
        <div className="core-orb"></div>
      </div>

      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
        System Idle
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm text-sm leading-relaxed mx-auto px-4">
        No active instances detected in your environment.
        <br />
        <span className="text-xs opacity-70 mt-2 block">
          Resources are ready for provisioning.
        </span>
      </p>

      <button
        className="mt-8 px-6 py-2.5 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 text-xs font-bold uppercase tracking-wider transition-all"
        onClick={() => window.location.reload()}
      >
        Check Again
      </button>
    </div>
  );
};

export default VMEmptyState;
