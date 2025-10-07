// services/apiService.ts

const API_BASE_URL = 'http://localhost:3001/api';
const JWT_TOKEN_KEY = 'maitri_jwt';

// --- JWT Management ---
export const saveToken = (token: string): void => {
    localStorage.setItem(JWT_TOKEN_KEY, token);
};

export const getToken = (): string | null => {
    return localStorage.getItem(JWT_TOKEN_KEY);
};

export const removeToken = (): void => {
    localStorage.removeItem(JWT_TOKEN_KEY);
};

// --- Core API Fetch Function ---
const apiFetch = async <T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> => {
    const token = getToken();
    const headers = new Headers(options.headers || {});
    headers.append('Content-Type', 'application/json');

    if (token) {
        headers.append('Authorization', `Bearer ${token}`);
    }

    const config: RequestInit = {
        ...options,
        headers,
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        if (!response.ok) {
            // Handle HTTP errors like 4xx, 5xx
            const errorData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}` }));
            throw new Error(errorData.message || `An unknown error occurred`);
        }
        
        // Handle cases with no response body (e.g., 204 No Content)
        if (response.status === 204) {
            return null as T;
        }

        return await response.json() as T;
    } catch (error) {
        console.error(`API fetch error on endpoint ${endpoint}:`, error);
        // Re-throw the error to be handled by the calling service/component
        throw error;
    }
};

// --- Exported API Methods ---
export const apiService = {
    get: <T>(endpoint: string, options?: RequestInit) =>
        apiFetch<T>(endpoint, { ...options, method: 'GET' }),

    post: <T>(endpoint:string, body: any, options?: RequestInit) =>
        apiFetch<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),

    put: <T>(endpoint: string, body: any, options?: RequestInit) =>
        apiFetch<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
        
    delete: <T>(endpoint: string, options?: RequestInit) =>
        apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),
};
