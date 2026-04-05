import { useEffect } from "react"
import { RouterProvider } from "react-router"
import { router } from "./app.routes.jsx"
import { AuthProvider } from "./features/auth/auth.context.jsx"
import { InterviewProvider } from "./features/interview/interview.context.jsx"
import "./style.scss"  // ✅ Global styles yahan import karo — ek jagah se
import { keepServerAlive } from "./utils/keepAlive"


function App() {

    useEffect(() => {
        // ✅ Render free tier — server so na jaye
        keepServerAlive()
    }, []) 
    return (
        <AuthProvider>
            {/**
              * ✅ InterviewProvider AuthProvider ke andar hai — sahi hai
              * useAuth, useInterview dono context available hain
              *
              * ✅ LESSON 133: Context order important hai
              * InterviewProvider ko AuthProvider ke andar rakhna sahi hai
              * kyunki future mein InterviewProvider ko
              * user info ki zaroorat pad sakti hai
              */}
            <InterviewProvider>
                <RouterProvider router={router} />
            </InterviewProvider>
        </AuthProvider>
    )
}

export default App