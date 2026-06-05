
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { fetchAuthSession } from 'aws-amplify/auth';
import AssessmentRunner from './AssessmentRunner';
import { ASSESSMENT_API_BASE_URL } from '../api';

const AssessmentTaker = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [assessmentData, setAssessmentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [derivedCohortId, setDerivedCohortId] = useState('cohort-1'); // Default fallback

    useEffect(() => {
        if (!id) return;

        const fetchAssessment = async () => {
            setLoading(true);
            try {
                // Determine API URL - using localhost for now matching previous implementation
                const res = await fetch(`${ASSESSMENT_API_BASE_URL}/assessments/${id}/take?username=${user?.username || 'candidate'}`);

                if (res.ok) {
                    const data = await res.json();

                    // Validate time constraints
                    const now = new Date();
                    const assessmentInfo = data.assessment || {};
                    if (assessmentInfo.end_time && new Date(assessmentInfo.end_time) < now) {
                        setError('This assessment has expired and is no longer available.');
                        return;
                    }
                    if (assessmentInfo.start_time && new Date(assessmentInfo.start_time) > now) {
                        setError('This assessment is scheduled for a future date and has not started yet.');
                        return;
                    }

                    setAssessmentData(data);
                } else {
                    const errText = await res.text();
                    setError(errText || 'Failed to load assessment');
                }
            } catch (e) {
                console.error(e);
                setError('Network error loading assessment');
            } finally {
                setLoading(false);
            }
        };

        // Logic to derive cohort from username matching (Copied from AssessmentsList.jsx)
        const fetchAndDeriveCohort = async () => {
            if (!user || !user.username) return;
            try {
                let cohortsList = [];
                const cachedCohorts = sessionStorage.getItem('cached_cohorts');

                if (cachedCohorts) {
                    const parsed = JSON.parse(cachedCohorts);
                    cohortsList = parsed.map(c => typeof c === 'string' ? c : c.name || c);
                } else {
                    const res = await fetch('https://x6uz5z6ju2.execute-api.us-west-2.amazonaws.com/SQLAdmin?type=cohorts');
                    if (res.ok) {
                        const data = await res.json();
                        cohortsList = data.cohorts || [];
                        sessionStorage.setItem('cached_cohorts', JSON.stringify(cohortsList));
                    }
                }

                // Sort by length desc to match longest prefix
                cohortsList.sort((a, b) => b.length - a.length);
                const match = cohortsList.find(c => user.username.startsWith(c));

                if (match) {
                    // console.log(`[AssessmentTaker] Derived Cohort: ${match}`);
                    setDerivedCohortId(match);
                } else {
                    // console.warn("[AssessmentTaker] No matching cohort prefix found for user:", user.username);
                }
            } catch (e) {
                console.error("Failed to derive cohort in Taker:", e);
            }
        };

        fetchAssessment();
        fetchAndDeriveCohort();

        // Debug: Log session on mount

        const logSession = async () => {
            try {
                const session = await fetchAuthSession();
                // console.log("AssessmentTaker Mount - Auth Session:", session);
                // console.log("AssessmentTaker Mount - Payload:", session.tokens?.accessToken?.payload);
            } catch (e) {
                // console.error("Auth Debug Error:", e);
            }
        };
        logSession();
    }, [id]);

    const handleFinish = async (submittedAnswers, timingInfo, questionTypes, proctoringData, isAutoSubmit = false) => {
        const hasSubmittedPrev = sessionStorage.getItem(`submitted_prev_${id}`) === 'true';
        if (hasSubmittedPrev) {
            const attemptId = sessionStorage.getItem(`attempt_id_${id}`);
            sessionStorage.removeItem(`submitted_prev_${id}`);
            sessionStorage.removeItem(`attempt_id_${id}`);
            alert('Assessment Submitted Successfully!');
            if (attemptId) {
                navigate(`/assessment/results/${attemptId}`);
            } else {
                navigate('/assessment/assessments-list');
            }
            return;
        }

        const { marks: questionMarks, faceViolations: faceViolationCount, tabSwitchCount } = proctoringData || {};
        if (!isAutoSubmit && (!submittedAnswers || Object.keys(submittedAnswers).length === 0)) {
            if (!window.confirm("You have not answered any questions. Are you sure you want to finish?")) return;
        }

        setSubmitting(true);
        try {
            const userId = user?.username || 'candidate';

            let token;
            try {
                const session = await fetchAuthSession();
                // console.log("AssessmentTaker Submit - Auth Session:", session);
                // console.log("AssessmentTaker Submit - Payload:", session.tokens?.accessToken?.payload);
                token = session.tokens?.accessToken?.toString();
            } catch (err) {
                console.error("Error fetching auth session", err);
            }

            // Score Accumulators
            let mcqScore = 0;
            let mcqTotal = 0;
            let sqlScore = 0;
            let sqlTotal = 0;

            let mcqAttempted = 0;
            let sqlAttempted = 0;

            let mcqQuestionCount = 0;
            let sqlQuestionCount = 0;

            // Calculate Totals from ALL questions (passed via questionTypes)
            // This ensures we count questions even if the user didn't answer them.
            if (questionTypes && questionMarks) {
                Object.entries(questionTypes).forEach(([id, type]) => {
                    const t = type.toUpperCase();
                    const pts = questionMarks[id] || 5;
                    if (t === 'SQL') {
                        sqlTotal += pts;
                        sqlQuestionCount++;
                    } else if (t !== 'FILE_UPLOAD') {
                        mcqTotal += pts;
                        mcqQuestionCount++;
                    }
                });
            } else if (assessmentData?.rounds) {
                // Fallback Calculation if somehow missing questionTypes
                for (const r of assessmentData.rounds) {
                    if (r.questions) {
                        for (const q of r.questions) {
                            const pts = parseInt(q.marks || q.points || 5);
                            const t = (q.type || r.type || 'MCQ').toUpperCase();
                            if (t === 'SQL') {
                                sqlTotal += pts;
                                sqlQuestionCount++;
                            } else if (t !== 'FILE_UPLOAD') {
                                mcqTotal += pts;
                                mcqQuestionCount++;
                            }
                        }
                    }
                }
            }
            // Loop through all answers and submit
            // Note: In a real high-scale app, a bulk submit endpoint is better. 
            // Here we reuse the single submit endpoint as requested/analyzed.
            const promises = Object.entries(submittedAnswers).map(async ([qId, val]) => {

                // Look up the question type from questionTypes map (TRUSTED SOURCE from Runner)
                // Fallback to assessmentData logic if missing
                let qType = 'MCQ';
                if (questionTypes && questionTypes[qId]) {
                    qType = questionTypes[qId].toUpperCase();
                } else if (assessmentData?.rounds) {
                    // Fallback Logic
                    for (const r of assessmentData.rounds) {
                        const found = r.questions?.find(q => String(q.id) === String(qId));
                        if (found) {
                            qType = (found.type || r.type || 'MCQ').toUpperCase();
                            // console.log(`[DEBUG] qId: ${qId}, Found in round type: ${r.type}, Question type: ${found.type}, Final qType: ${qType}`);
                            break;
                        }
                    }
                } else {
                    // console.warn("[DEBUG] assessmentData.rounds is missing or empty");
                }

                // Increment Attempted Count (only if answer is not empty)
                if (val !== undefined && val !== null && String(val).trim() !== '') {
                    if (qType === 'SQL') sqlAttempted++;
                    else if (qType !== 'FILE_UPLOAD') mcqAttempted++;
                }

                let submissionData = {};
                if (qType === 'SQL') {
                    submissionData = { query: val };
                } else if (qType === 'FILE_UPLOAD') {
                    try {
                        submissionData = typeof val === 'string' ? JSON.parse(val) : val;
                    } catch (e) {
                        submissionData = { fileUrl: val };
                    }
                } else {
                    submissionData = { optionId: val, answer: val };
                }

                const res = await fetch(`${ASSESSMENT_API_BASE_URL}/submissions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        userId,
                        questionId: qId,
                        submissionData
                    })
                });
                const result = await res.json();

                // Track Correctness
                if (result.status === 'PASS' || result.status === 'Pass') {
                    const pts = (questionMarks && questionMarks[qId]) || 5;
                    if (qType === 'SQL') sqlScore += pts; else if (qType !== 'FILE_UPLOAD') mcqScore += pts;
                }

                return result;
            });

            await Promise.all(promises);

            // Stop Kode Env instances in background on finish
            const hasKodeEnv = (questionTypes && Object.values(questionTypes).some(t => t.toUpperCase() === 'KODE_ENV')) ||
                               (assessmentData?.rounds && assessmentData.rounds.some(r => r.type === 'KODE_ENV'));
            if (hasKodeEnv) {
                const CODE_LAMBDA_URL = "https://95nevlbwb2.execute-api.ap-south-1.amazonaws.com/Beta/CODEnv";
                try {
                    fetch(`${CODE_LAMBDA_URL}?username=${userId}`)
                        .then(res => res.json())
                        .then(data => {
                            let bodyData = data.body ? (typeof data.body === 'string' ? JSON.parse(data.body) : data.body) : data;
                            const instancesList = bodyData.instances || bodyData || [];
                            instancesList.forEach(inst => {
                                if (inst.instanceId) {
                                    const stopUrl = `${CODE_LAMBDA_URL}?username=${encodeURIComponent(userId)}&instanceId=${encodeURIComponent(inst.instanceId)}&stop=true`;
                                    fetch(stopUrl);
                                    console.log(`[AssessmentTaker] Stop environment requested for: ${inst.instanceId}`);
                                }
                            });
                        })
                        .catch(err => console.error("Failed to stop VMs on finish:", err));
                } catch (e) {
                    console.error("Error initiating stop VMs:", e);
                }
            }

            // POST Aggregated Report
            const reportRes = await fetch(`${ASSESSMENT_API_BASE_URL}/reports/submit-result`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    assessmentId: id,
                    assessmentName: assessmentData?.assessment?.name || assessmentData?.assessment?.title,
                    userId,
                    cohortId: derivedCohortId,
                    mcq: {
                        score: mcqScore,
                        total: mcqTotal,
                        timeTaken: timingInfo?.mcqTime || 0,
                        attempted: mcqAttempted,
                        questionCount: mcqQuestionCount
                    },
                    sql: {
                        score: sqlScore,
                        total: sqlTotal,
                        timeTaken: timingInfo?.sqlTime || 0,
                        attempted: sqlAttempted,
                        questionCount: sqlQuestionCount
                    }
                })
            });

            const reportData = await reportRes.json();


            alert('Assessment Submitted Successfully!');

            // Determine if it was purely a file upload assessment to skip results
            let isFileUploadAssessment = false;
            // Check based on questionTypes if available
            if (questionTypes) {
                const types = Object.values(questionTypes);
                if (types.length > 0 && types.every(t => t === 'FILE_UPLOAD')) {
                    isFileUploadAssessment = true;
                }
            } else if (assessmentData?.rounds) {
                // Check rounds
                const allTypes = [];
                assessmentData.rounds.forEach(r => {
                    r.questions.forEach(q => {
                        allTypes.push(q.type || r.type);
                    });
                });
                if (allTypes.length > 0 && allTypes.every(t => t === 'FILE_UPLOAD')) {
                    isFileUploadAssessment = true;
                }
            }

            if (reportData.attemptId && !isFileUploadAssessment) {
                navigate(`/assessment/results/${reportData.attemptId}`);
            } else {
                navigate('/assessment/assessments-list');
            }

        } catch (e) {
            console.error(e);
            alert('Error submitting assessment. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-brand-dark">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300">Loading Assessment...</h2>
                </div>
            </div>
        );
    }

    if (submitting) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-brand-dark">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Submitting Assessment...</h2>
                    <p className="text-gray-500">Please do not close this window.</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-brand-dark">
                <div className="bg-white dark:bg-brand-card p-8 rounded-2xl shadow-xl max-w-md text-center border border-red-100 dark:border-red-900/30">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-3xl">error</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Unable to Load Assessment</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/assessment/assessments-list')}
                        className="px-6 py-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-lg text-gray-700 dark:text-white font-medium transition-colors"
                    >
                        Return to List
                    </button>
                </div>
            </div>
        );
    }

    const handleProceedToKodeEnv = async (submittedAnswers, timingInfo, questionTypes, proctoringData) => {
        try {
            const userId = user?.username || 'candidate';
            let token;
            try {
                const session = await fetchAuthSession();
                token = session.tokens?.accessToken?.toString();
            } catch (err) {
                console.error("Error fetching auth session", err);
            }

            // Score Accumulators
            let mcqScore = 0;
            let mcqTotal = 0;
            let sqlScore = 0;
            let sqlTotal = 0;

            let mcqAttempted = 0;
            let sqlAttempted = 0;

            let mcqQuestionCount = 0;
            let sqlQuestionCount = 0;

            const { marks: questionMarks } = proctoringData || {};

            if (questionTypes && questionMarks) {
                Object.entries(questionTypes).forEach(([qId, type]) => {
                    const t = type.toUpperCase();
                    const pts = questionMarks[qId] || 5;
                    if (t === 'SQL') {
                        sqlTotal += pts;
                        sqlQuestionCount++;
                    } else if (t !== 'FILE_UPLOAD' && t !== 'KODE_ENV') {
                        mcqTotal += pts;
                        mcqQuestionCount++;
                    }
                });
            }

            // Loop through all answers and submit
            const promises = Object.entries(submittedAnswers).map(async ([qId, val]) => {
                let qType = 'MCQ';
                if (questionTypes && questionTypes[qId]) {
                    qType = questionTypes[qId].toUpperCase();
                }
                if (qType === 'KODE_ENV') return null;

                if (val !== undefined && val !== null && String(val).trim() !== '') {
                    if (qType === 'SQL') sqlAttempted++;
                    else if (qType !== 'FILE_UPLOAD') mcqAttempted++;
                }

                let submissionData = {};
                if (qType === 'SQL') {
                    submissionData = { query: val };
                } else if (qType === 'FILE_UPLOAD') {
                    try {
                        submissionData = typeof val === 'string' ? JSON.parse(val) : val;
                    } catch (e) {
                        submissionData = { fileUrl: val };
                    }
                } else {
                    submissionData = { optionId: val, answer: val };
                }

                const res = await fetch(`${ASSESSMENT_API_BASE_URL}/submissions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        userId,
                        questionId: qId,
                        submissionData
                    })
                });
                const result = await res.json();

                if (result.status === 'PASS' || result.status === 'Pass') {
                    const pts = (questionMarks && questionMarks[qId]) || 5;
                    if (qType === 'SQL') sqlScore += pts; else if (qType !== 'FILE_UPLOAD') mcqScore += pts;
                }

                return result;
            });

            await Promise.all(promises.filter(Boolean));

            // POST Aggregated Report
            const reportRes = await fetch(`${ASSESSMENT_API_BASE_URL}/reports/submit-result`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    assessmentId: id,
                    assessmentName: assessmentData?.assessment?.name || assessmentData?.assessment?.title,
                    userId,
                    cohortId: derivedCohortId,
                    mcq: {
                        score: mcqScore,
                        total: mcqTotal,
                        timeTaken: timingInfo?.mcqTime || 0,
                        attempted: mcqAttempted,
                        questionCount: mcqQuestionCount
                    },
                    sql: {
                        score: sqlScore,
                        total: sqlTotal,
                        timeTaken: timingInfo?.sqlTime || 0,
                        attempted: sqlAttempted,
                        questionCount: sqlQuestionCount
                    }
                })
            });

            const reportData = await reportRes.json();
            if (reportData.attemptId) {
                sessionStorage.setItem(`attempt_id_${id}`, reportData.attemptId);
            }
            sessionStorage.setItem(`submitted_prev_${id}`, 'true');
            return true;

        } catch (e) {
            console.error("Auto-submit error:", e);
            alert('Error auto-submitting previous sections. Please try again.');
            return false;
        }
    };

    return (
        <AssessmentRunner
            assessmentData={assessmentData}
            user={user}
            onFinish={handleFinish}
            onProceedToKodeEnv={handleProceedToKodeEnv}
        />
    );
};

export default AssessmentTaker;
