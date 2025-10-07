// services/apiService.ts

// This would be in an environment variable in a real production app
const API_BASE_URL = '/api/v1'; // Using a relative path for a proxy setup

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

    // NOTE: In this environment, `fetch` will not work as there is no backend.
    // The code is structured correctly for a real environment, but will throw
    // network errors here. This is expected. We are demonstrating the
    // frontend architecture, not a live connection.
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        if (!response.ok) {
            // Handle HTTP errors like 4xx, 5xx
            const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
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
