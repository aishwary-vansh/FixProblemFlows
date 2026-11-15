import axios from "axios";
import { API_URL } from "../services/api";

/*
 * The FixFlow Console keeps its own login, separate from any organization's session,
 * so a console admin can be logged in to the console and to an organization at the same time.
 */
const TOKEN_KEY = "fixflow.console.token";
const ADMIN_KEY = "fixflow.console.admin";

export interface ConsoleAdmin {
    id: number;
    name: string;
    email: string;
}

const read = (key: string) => {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
};

export const getConsoleAdmin = (): ConsoleAdmin | null => {
    const raw = read(ADMIN_KEY);
    if (!raw || !read(TOKEN_KEY)) return null;
    try {
        return JSON.parse(raw) as ConsoleAdmin;
    } catch {
        return null;
    }
};

export const saveConsoleSession = (token: string, admin: ConsoleAdmin) => {
    try {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
    } catch {
        // Private mode without storage: the console works until the tab closes.
    }
};

export const clearConsoleSession = () => {
    try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(ADMIN_KEY);
    } catch {
        // Nothing stored.
    }
};

const consoleApi = axios.create({ baseURL: `${API_URL}/api/platform` });

consoleApi.interceptors.request.use((config) => {
    const token = read(TOKEN_KEY);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// An expired console session goes back to the console login, not the organization login.
consoleApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (axios.isAxiosError(error) && error.response?.status === 401 && error.config?.headers?.Authorization) {
            clearConsoleSession();
            window.location.assign("/console/login");
        }
        return Promise.reject(error);
    }
);

export default consoleApi;
