import { useNavigate } from "react-router";
import { useAuth } from "../hooks/useauth";




const Protected = ({children}) => {
    const { loading, user } = useAuth()
    

    if(loading) {
        return (<main><h1>Loading......</h1></main>)
    }

    if(!user) {
        return <Navigate to={'/login'} />
    }

    return children
}