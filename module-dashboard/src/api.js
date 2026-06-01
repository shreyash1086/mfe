// ==========================================
// ENVIRONMENT TOGGLE
// Comment/Uncomment the ONE environment you want to use
// ==========================================

// --- LOCALHOST ENVIRONMENT ---
//const BASE_API_URL = 'http://localhost:5000/api';

// --- CLOUD (EC2 GATEWAY) ENVIRONMENT ---
// const BASE_API_URL = 'https://nayjy1u9qc.execute-api.ap-south-1.amazonaws.com';

const BASE_API_URL = "https://rqfuqmne32.execute-api.eu-central-1.amazonaws.com";

// ==========================================
// API ENDPOINT CONFIGURATIONS (Automatically derived)
// ==========================================
export const ASSESSMENT_API_BASE_URL = BASE_API_URL;
export const COURSE_API_BASE_URL = `${BASE_API_URL}/courses`;
export const CONTENT_API_BASE_URL = `${BASE_API_URL}/content`;

// Fallback legacy export if needed anywhere
export const EC2_GATEWAY_API_BASE_URL = BASE_API_URL;
