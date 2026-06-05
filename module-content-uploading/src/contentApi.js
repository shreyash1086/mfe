// Direct Lambda URLs are used in ALL environments (dev + prod).
//
// WHY NO PROXY:
// The shell's webpack `historyApiFallback: true` intercepts requests like
// /content-category-api BEFORE the proxy middleware runs, returning index.html
// instead of forwarding to the Lambda. Verified by:
//   curl -i http://localhost:3000/content-category-api → 200 text/html (index.html)
//
// WHY DIRECT URLS WORK:
// Both Lambdas respond with `access-control-allow-origin: *`, so browsers
// can call them cross-origin directly without any proxy.
//   curl -I https://pnb45plz...lambda-url... → access-control-allow-origin: *

export const CONTENT_API_BASE_URL = 'https://bd524zjmrldzimglbmmgzkkenq0oxobj.lambda-url.eu-central-1.on.aws';

export const CATEGORY_API_URL = 'https://pnb45plzoveg6irps5rk24elhu0vvagj.lambda-url.eu-central-1.on.aws/categories';

// API Endpoints
export const CONTENT_ENDPOINTS = {
    CATEGORIES: '/categories',
    UPLOAD: '/upload-content',
    ASSIGN: '/assign-content',
    LIST: '/list-content',
    VIEW: '/view-content',
    DELETE: '/delete-content'
};
