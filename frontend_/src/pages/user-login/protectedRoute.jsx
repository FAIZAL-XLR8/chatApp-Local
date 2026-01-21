import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useState , useEffect} from "react";
import useUserStore from "../../store/useUserStore";
import {checkAuthenticated}from '../../services/loginService'
import Loader from "../../utils/Loader"
export const  ProtectedRoute =() => {
    //we need to have a state where we know api call is being made for checking authenticatiom
    const [isChecking, setIsChecking] = useState (true);
    const location = useLocation();
    //location tells us avout tum kidhr ho yaani which page are uh at '/what-domain'
    const {isAuthenticated, setUser, clearUser} = useUserStore();
    useEffect (()=>{
        const verifyAuth = async () =>{
            try{
                const result = await checkAuthenticated();
                if (result?.isAuthenticated)
                {
                    setUser(result.user);
                    
                }else
                {
                    clearUser();
                }
            }catch(error)
            {
                console.error (error);
                clearUser();
            }finally
            {
                setIsChecking(false);
            }
        }
        verifyAuth();
    },[setUser, clearUser]);
    if(isChecking)
    {
        return <Loader/>
    }
    if (!isAuthenticated)
    {
        return <Navigate to='/user-login' state={{from : location}} replace></Navigate>
    }
    // if user is authernticated then navigate to private route
    //below will be protected route
    return <Outlet></Outlet>
} 
export const PublicRoute = () => {
    const isAuthenticated = useUserStore(state => state.isAuthenticated);
    //is user is Authenticated then send to the homepage
    if (isAuthenticated)
    {
        return <Navigate to="/" replace/>
    }
    //if not authenticated then send to public route
    return <Outlet></Outlet>
}