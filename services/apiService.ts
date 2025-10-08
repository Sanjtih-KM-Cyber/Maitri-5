
// services/apiService.ts

const API_BASE_URL = '/api'; // Use a relative URL for proxying
const JWT_TOKEN_KEY = 'maitri_jwt';

// --- JWT Management ---
export const saveToken = (token: string): void => {
    try {
        localStorage.setItem(JWT_TOKEN_KEY, token);
    } catch (error) {
        console.error("Could not save token to localStorage", error);
    }
};

export const getToken = (): string | null => {
    try {
        return localStorage.getItem(JWT_TOKEN_KEY);
    } catch (error) {
        console.error("Could not get token from localStorage", error);
        return null;
    }
};

export const removeToken = (): void => {
    try {
        localStorage.removeItem(JWT_TOKEN_KEY);
    } catch (error) {
        console.error("Could not remove token from localStorage", error);
    }
};

// --- Core API Fetch Function ---
const apiFetch = async <T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> => {
    const token = getToken();
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type')) {
        headers.append('Content-Type', 'application/json');
    }

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
            const errorData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}` }));
            throw new Error(errorData.message || `An unknown server error occurred`);
        }
        
        if (response.status === 204) {
            return null as T;
        }

        return await response.json() as T;
    } catch (error) {
        console.error(`API fetch error on endpoint ${endpoint}:`, error);
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
