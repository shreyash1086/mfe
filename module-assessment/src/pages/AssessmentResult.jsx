import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../AuthContext";
import { ASSESSMENT_API_BASE_URL } from "../api";

const AssessmentResult = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        // We need an endpoint to fetch a single attempt by ID.
        // Currently reports endpoint is by user or cohort.
        // We can reuse getCandidateReports and filter, or make a new endpoint.
        // For efficiency, let's assume we can filter by exact attempt ID if we pass it,
        // OR logically filter from the list for now since we don't want to touch backend again if not needed.
        // Actually ReportController.getCandidateReports uses user_id.
        // Let's rely on fetching user reports and finding the one with this ID?
        // No, `attemptId` is UUID.
        // Let's add a quick endpoint or just filter on client side if we fetch by user.

        // Ideally: GET /api/reports/attempt/:attemptId
        // Workaround: GET /api/reports/candidate?userId=... and find matching attempt.
        // Wait, I don't have the attempt ID in the URL for the screenshot provided by user?
        // User screenshot url: /assessment/results/2e48371c... (looks like UUID)

        if (!user?.username) return;

        if (!user?.username) return;
        const res = await fetch(
          `${ASSESSMENT_API_BASE_URL}/reports/candidate?userId=${user.username}`,
        );
        if (res.ok) {
          const data = await res.json();
          const found = data.find((d) => d.id === attemptId);
          if (found) {
            setResult(found);
          } else {
            setError("Result not found.");
          }
        } else {
          setError("Failed to fetch results.");
        }
      } catch (err) {
        console.error(err);
        setError("Network error.");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchResult();
    }
  }, [attemptId, user]);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-brand-dark">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  if (error || !result)
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-brand-dark text-red-500">
        {error || "Result not found"}
      </div>
    );

  const rawAssessmentName = result.current_assessment_name || result.assessment_name || '';
  const isScoreHidden = rawAssessmentName.includes('[HideScore]');
  const cleanAssessmentName = rawAssessmentName.replace(' [KodeEnv]', '').replace('[KodeEnv]', '').replace(' [HideScore]', '').replace('[HideScore]', '').trim();

  const totalScore = result.mcq_score + result.sql_score;
  const totalMax = result.mcq_total + result.sql_total;
  const percentage =
    totalMax > 0 ? ((totalScore / totalMax) * 100).toFixed(1) : 0;
  const isPass = isScoreHidden ? true : percentage >= 60; // Example threshold

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  return (
    <div className="absolute inset-0 z-50 bg-gray-50 dark:bg-brand-dark flex flex-col items-center justify-start p-4 pb-12 font-['Poppins',sans-serif] overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl w-full my-8 bg-white dark:bg-brand-card rounded-3xl shadow-2xl border border-gray-100 dark:border-[#333]"
      >
        {/* Header Section */}
        <div className="text-center p-12 pb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-lg ${isPass ? "bg-green-100 text-green-600 dark:bg-green-900/30" : "bg-blue-100 text-blue-600 dark:bg-blue-900/30"}`}
          >
            <span className="material-symbols-outlined text-5xl">
              {isPass ? "check_circle" : "analytics"}
            </span>
          </motion.div>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Assessment Completed!
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            {cleanAssessmentName}
          </p>
        </div>

        {isScoreHidden ? (
          <div className="mx-8 p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 text-center mb-12 relative overflow-hidden">
            <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2">
              Your assessment has been submitted successfully.
            </h2>
            <p className="text-blue-700 dark:text-blue-300">
              The results are hidden for this assessment.
            </p>
          </div>
        ) : (
          <>
            {/* Score Big Card */}
            <div className="mx-8 p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#252526] dark:to-brand-card rounded-2xl border border-gray-200 dark:border-[#333] text-center mb-8 relative overflow-hidden">
              <div
                className={`absolute top-0 left-0 w-full h-2 ${isPass ? "bg-green-500" : "bg-blue-500"}`}
              ></div>
              <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">
                Your Overall Score
              </h2>
              <div
                className={`text-6xl font-extrabold mb-2 ${isPass ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"}`}
              >
                {percentage}%
              </div>
              <p className="text-gray-600 dark:text-gray-300 font-medium pb-2">
                {totalScore} out of {totalMax} points scored
              </p>
              <div className="inline-block bg-gray-200 dark:bg-[#333] px-3 py-1 rounded-full text-xs font-bold text-gray-600 dark:text-gray-300">
                Internal Validation: {(result.mcq_attempted || 0) + (result.sql_attempted || 0)} Questions Attempted
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className={`grid grid-cols-1 gap-6 mx-8 mb-12 ${(result.mcq_total > 0 && result.sql_total > 0) ? 'md:grid-cols-2' : 'md:max-w-2xl md:mx-auto'}`}>
              {/* MCQ Card */}
              {result.mcq_total > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-6 border border-blue-100 dark:border-blue-900/20">
                  <div className="flex items-center gap-3 mb-4 text-blue-700 dark:text-blue-400">
                    <span className="material-symbols-outlined">list_alt</span>
                    <h3 className="font-bold text-lg">MCQ Section</h3>
                  </div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      {result.mcq_score}
                      <span className="text-base text-gray-500 ml-1">
                        / {result.mcq_total}
                      </span>
                    </span>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 text-right">
                      <div className="font-bold">Score</div>
                      <div className="text-xs">Attempted: {result.mcq_attempted || 0}</div>
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-900/30 h-2 rounded-full mb-4">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(result.mcq_score / (result.mcq_total || 1)) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <span className="material-symbols-outlined text-sm">timer</span>
                    Time Taken:{" "}
                    <span className="text-gray-900 dark:text-white">
                      {formatTime(result.mcq_time_taken)}
                    </span>
                  </div>
                </div>
              )}

              {/* SQL Card */}
              {result.sql_total > 0 && (
                <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-xl p-6 border border-indigo-100 dark:border-indigo-900/20">
                  <div className="flex items-center gap-3 mb-4 text-indigo-700 dark:text-indigo-400">
                    <span className="material-symbols-outlined">database</span>
                    <h3 className="font-bold text-lg">SQL Section</h3>
                  </div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      {result.sql_score}
                      <span className="text-base text-gray-500 ml-1">
                        / {result.sql_total}
                      </span>
                    </span>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 text-right">
                      <div className="font-bold">Score</div>
                      <div className="text-xs">Attempted: {result.sql_attempted || 0}</div>
                    </span>
                  </div>
                  <div className="w-full bg-indigo-200 dark:bg-indigo-900/30 h-2 rounded-full mb-4">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{
                        width: `${(result.sql_score / (result.sql_total || 1)) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <span className="material-symbols-outlined text-sm">timer</span>
                    Time Taken:{" "}
                    <span className="text-gray-900 dark:text-white">
                      {formatTime(result.sql_time_taken)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer Actions */}
        <div className="bg-gray-50 dark:bg-[#252526] px-8 py-6 flex justify-between items-center border-t border-gray-100 dark:border-[#333] rounded-b-3xl">
          <button
            onClick={() => navigate("/assessment/assessments-list")}
            className="px-6 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#333] transition-colors"
          >
            Back to Assessments
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-8 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all"
          >
            Go to Dashboard
          </button>
        </div>
      </motion.div>

      <p className="mt-8 text-xs text-gray-400 font-mono">
        Session ID: {result.id}
      </p>
    </div>
  );
};

export default AssessmentResult;
