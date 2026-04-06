import axios from "axios"

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
    withCredentials: true,
    timeout: 15000
})

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const pathname = window.location.pathname
            const isPublicPage = pathname.includes("/login") ||
                                 pathname.includes("/register")

            // ✅ getMe 401 ignore karo — cookie cross-domain issue
            const isGetMe = error.config?.url?.includes("/api/auth/get-me")

            if (!isPublicPage && !isGetMe) {
                window.location.href = "/login"
            }
        }

        if (error.code === "ECONNABORTED") {
            error.message = "Request timed out. Please try again."
        }

        return Promise.reject(error)
    }
)

export async function register({ username, email, password }) {
    const response = await api.post("/api/auth/register", {
        username,
        email,
        password
    })
    return response.data
}

export async function login({ email, password }) {
    const response = await api.post("/api/auth/login", {
        email,
        password
    })
    return response.data
}

export async function logout() {
    const response = await api.post("/api/auth/logout")
    return response.data
}

export async function getMe() {
    const response = await api.get("/api/auth/get-me")
    return response.data
}