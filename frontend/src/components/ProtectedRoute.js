import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { useFetchUserQuery } from '../redux/api/authAPI';
import { getToken } from '../redux/slice/authSlice';

const ProtectedRoute = ({ children }) => {

  const location = useLocation();

  const token=useSelector(getToken);
  // console.log(" ProtectedRoute ~ token:", token)

  // const { data: user, error, isLoading } = useFetchUserQuery(undefined, { skip: !token });

  // if (!token ||  error) {
  //   return <Navigate to="/login" state={{ from: location }} />;
  // }

  // return children;
  return token?children:<Navigate to="/login" state={{ from: location }} />;
  
};

export default ProtectedRoute;
