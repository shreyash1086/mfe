import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';

const ProctoringWebcam = ({ onStatusChange }) => {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = '/models';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                ]);
                setModelsLoaded(true);
                // Notify parent that model is ready
                if (onStatusChange) onStatusChange({ status: 'model_loaded', message: 'Face detection model loaded' });
            } catch (err) {
                console.error("Error loading models:", err);
                setError("Failed to load AI models");
            }
        };
        loadModels();
    }, []);

    return (
        <div className="relative w-full h-full bg-black overflow-hidden shadow-none">
            {!modelsLoaded && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-xs z-20">
                    Loading AI...
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center text-red-500 text-xs z-20">
                    {error}
                </div>
            )}
            <Webcam
                ref={webcamRef}
                audio={false}
                className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Overlay Canvas for bounding boxes */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* Trigger detection loop manually once models are loaded and video is ready */}
            {modelsLoaded && <DetectionLoop webcamRef={webcamRef} canvasRef={canvasRef} onStatusChange={onStatusChange} />}
        </div>
    );
};

// Separated component to cleanly manage the interval effect
const DetectionLoop = ({ webcamRef, canvasRef, onStatusChange }) => {
    const statusPersistenceRef = useRef({
        missing: 0,
        ok: 0
    });
    const lastEmittedStatusRef = useRef({ status: 'ok', message: '' });

    useEffect(() => {
        const interval = setInterval(async () => {
            if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
                try {
                    const video = webcamRef.current.video;

                    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.1 });
                    const detections = await faceapi.detectAllFaces(video, options);

                    // Draw bounding boxes
                    if (canvasRef.current) {
                        const displaySize = { width: video.videoWidth, height: video.videoHeight };
                        faceapi.matchDimensions(canvasRef.current, displaySize);
                        const resizedDetections = faceapi.resizeResults(detections, displaySize);
                        canvasRef.current.getContext('2d').clearRect(0, 0, displaySize.width, displaySize.height);
                        faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
                    }

                    let currentFrameStatus = detections.length >= 1 ? 'ok' : 'missing';

                    // Update persistence counters
                    const counters = statusPersistenceRef.current;
                    if (currentFrameStatus === 'missing') {
                        counters.missing++;
                        counters.ok = 0;
                    } else {
                        counters.ok++;
                        counters.missing = 0;
                    }

                    // Determination Logic with Persistence Thresholds
                    let outputStatus = lastEmittedStatusRef.current.status;
                    let outputMessage = lastEmittedStatusRef.current.message;

                    // missing: 3 frames (1.5s) to confirm face is gone
                    // ok: 2 frames (1.0s) to confirm face is back
                    if (counters.missing >= 3) {
                        outputStatus = 'missing';
                        outputMessage = 'Face not visible';
                    } else if (counters.ok >= 2) {
                        outputStatus = 'ok';
                        outputMessage = '';
                    }

                    // Emit event only if status has consistently changed
                    if (outputStatus !== lastEmittedStatusRef.current.status) {
                        lastEmittedStatusRef.current = { status: outputStatus, message: outputMessage };
                        if (onStatusChange) onStatusChange({ status: outputStatus, message: outputMessage });
                    }

                } catch (e) {
                    console.error("Detection Loop Error:", e);
                }
            }
        }, 500); // 500ms Check Interval
        return () => clearInterval(interval);
    }, [webcamRef, canvasRef, onStatusChange]);

    return null;
};

export default ProctoringWebcam;
