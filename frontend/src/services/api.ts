import axios from "axios";
import { clearSession, getToken } from "../lib/session";

const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:5000").replace(/\/$/, "");

const api = axios.create({
    baseURL: `${API_URL}/api`,
});

api.interceptors.request.use((config) => {
    const token = getToken();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// An expired or revoked session sends the user back to login instead of leaving broken pages.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const hadToken = Boolean(error.config?.headers?.Authorization);
        if (axios.isAxiosError(error) && error.response?.status === 401 && hadToken) {
            clearSession();
            if (window.location.pathname !== "/login") {
                const here = window.location.pathname + window.location.search;
                window.location.assign(`/login?next=${encodeURIComponent(here)}`);
            }
        }
        return Promise.reject(error);
    }
);

/** Reads the API's `{ error: { message, details } }` shape, falling back to a generic message. */
export const getErrorMessage = (error: unknown, fallback = "Something went wrong") => {
    if (axios.isAxiosError(error)) {
        const apiError = error.response?.data?.error;
        const firstDetail = Array.isArray(apiError?.details) ? apiError.details[0]?.message : undefined;
        if (apiError?.code === "VALIDATION_ERROR" && firstDetail) {
            return firstDetail as string;
        }
        if (apiError?.message) {
            return apiError.message as string;
        }
        if (!error.response) {
            return "Can't reach the server. Check your connection and try again.";
        }
    }
    return fallback;
};

export default api;
