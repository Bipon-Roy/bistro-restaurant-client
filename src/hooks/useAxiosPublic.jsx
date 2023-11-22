import axios from "axios";

const axiosPublic = axios.create({
    baseURL: "https://bistro-restaurant-server-xi.vercel.app",
});

const useAxiosPublic = () => {
    return axiosPublic;
};

export default useAxiosPublic;
