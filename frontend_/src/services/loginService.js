import axiosClient from "./urlServices";
export const sendOtp = async (email, phoneNumber, phoneSuffix) => {
  try {
    const data = { email, phoneNumber, phoneSuffix };
    console.log("Data is ", data);
    const response = await axiosClient.post("/auth/send-otp", data);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};
export const verifyOtp = async (email, phoneNumber, phoneSuffix, otp) => {
  try {
    console.log(otp);
    const data = {
      email : email,
      phoneNumber,
      phoneSuffix,
      otp
    }
    console.log(data);
    const response = await axiosClient.post("/auth/verify-otp", data);
    console.log(response.data)
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};
export const updateProfile = async (updatedData) => {
  try {
    const response = await axiosClient.put("/auth/update-profile", updatedData);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};
export const checkAuthenticated = async () => {
    try {
  const response = await axiosClient.get ('/auth/check-auth');
    if(response.data.status === 'success') return{isAuthenticated : true, user : response?.data?.data};
    else  if(response.data.status === 'error') return{isAuthenticated : false};
    }catch (error)
    {
        throw error.response ? error.response.data : error.message;
    }
  
}
export const logoutUser = async()=>{
    try{
        const response = await axiosClient.post('/auth/logout');
        return response.data
    }catch(error)
    {throw error.response ? error.response.data : error.message;
    }
}
export const getAllUsers = async()=>{
    try{
        const response = await axiosClient.get('/auth/users');
        return response.data;
    }catch(error){
        throw error.response ? error.response.data : error.message;
    
    }
}

