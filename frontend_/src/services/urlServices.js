import axios from 'axios'
const apiURL = `${process.env.REACT_APP_API_URL}/api`;
const axiosClient = axios.create({
    baseURL: apiURL,
    withCredentials : true
})
export default axiosClient;
//data fetched from backend comes in response.data
//const response = await cleint.post/get()
//to fetch the dats afrom backend it is in response.data
//backend sends res.status(statusCode).json{respnseObject}
//tp get the responseObject reponse.data