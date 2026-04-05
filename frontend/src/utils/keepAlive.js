const BACKEND_URL = import.meta.env.VITE_API_BASE_URL

export const keepServerAlive = () => {
    setInterval(async () => {
        try {
            await fetch(`${BACKEND_URL}/api/health`)
        } catch (err) {
            // Silent fail
        }
    }, 14 * 60 * 1000)
}