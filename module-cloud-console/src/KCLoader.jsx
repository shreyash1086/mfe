import React from "react";

const KCLoader = ({ text = "Initializing Environment...", scale = 1 }) => {
  return (
    <div
      className="flex flex-col items-center justify-center w-full h-full"
      style={{ transform: `scale(${scale})` }}
    >
      <style>
        {`
                .vm-loader-container {
                    position: relative;
                    width: 120px;
                    height: 120px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }

                .server-box {
                    width: 60px;
                    height: 80px;
                    background: #09090b;
                    border: 2px solid #3563EB;
                    border-radius: 8px;
                    position: relative;
                    box-shadow: 0 0 15px rgba(6, 182, 212, 0.3);
                    z-index: 10;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: space-evenly;
                    animation: server-pulse 2s ease-in-out infinite;
                }

                .dark .server-box {
                    background: #000000;
                    border-color: #22d3ee;
                }

                .server-light {
                    width: 40px;
                    height: 4px;
                    background: #18181b;
                    border-radius: 2px;
                    position: relative;
                    overflow: hidden;
                }

                .server-light::after {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 0;
                    height: 100%;
                    width: 100%;
                    background: #22c55e;
                    transform: translateX(-100%);
                    animation: data-flow 1.5s linear infinite;
                }

                .server-light:nth-child(1)::after { animation-delay: 0.0s; }
                .server-light:nth-child(2)::after { animation-delay: 0.5s; }
                .server-light:nth-child(3)::after { animation-delay: 1.0s; }

                .orbit-ring {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    border: 2px solid transparent;
                    border-top-color: #3563EB;
                    border-bottom-color: #3563EB;
                    animation: kc-spin 3s linear infinite;
                    opacity: 0.5;
                }
                
                .orbit-ring:nth-child(2) {
                    width: 140%;
                    height: 140%;
                    border: 1px dashed #27272a;
                    animation: spin-reverse 8s linear infinite;
                    opacity: 0.3;
                }

                @keyframes server-pulse {
                    0%, 100% { box-shadow: 0 0 15px rgba(6, 182, 212, 0.3); transform: scale(1); }
                    50% { box-shadow: 0 0 25px rgba(6, 182, 212, 0.6); transform: scale(1.02); }
                }

                @keyframes data-flow {
                    0% { transform: translateX(-100%); }
                    50% { transform: translateX(100%); }
                    100% { transform: translateX(100%); }
                }

                @keyframes kc-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                @keyframes spin-reverse {
                    0% { transform: rotate(360deg); }
                    100% { transform: rotate(0deg); }
                }
                `}
      </style>

      <div className="vm-loader-container">
        <div className="orbit-ring"></div>
        <div className="orbit-ring"></div>
        <div className="server-box">
          <div className="server-light"></div>
          <div className="server-light"></div>
          <div className="server-light"></div>
        </div>
      </div>

      <span className="font-mono text-sm mt-8 text-brand-accent font-bold tracking-widest uppercase animate-pulse">
        {text}
      </span>
    </div>
  );
};

export default KCLoader;
