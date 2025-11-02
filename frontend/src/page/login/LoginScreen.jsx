import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useLoginMutation } from "../../redux/api/authAPI";
import { setUser } from "../../redux/slice/userSlice";
import { authTokenChange } from "../../redux/slice/authSlice";

const LoginScreen = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [login] = useLoginMutation();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSubmit = (e) => {
    if (!username || !password) {
      return;
    }
    handleLogin(e);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const requestParm = {
        email_id: username,
        password: password,
      };
      const data = await login(requestParm).unwrap();
      dispatch(
        authTokenChange({
          token: data.access_token,
          refreshToken: data.refresh_token,
        })
      );
      setLoading(false);
      // dispatch(setUser({ isLoggedIn: true }));
      // if (rememberMe) {
      // localStorage.setItem("isLoggedIn", true);
      // }
      navigate("/");
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <span className="sigin-text">
        Sign in to your <br />
        account
      </span>
      <div className="p-field" style={{ paddingTop: 5 }}>
        <span>Welcome Back!</span>
      </div>
      <form onSubmit={handleSubmit} className="form">
        <div className="p-field">
          <InputText
            id="username"
            data-testid="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            required
          />
        </div>

        <div className="p-field">
          <Password
            id="password"
            data-testid="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="password-field"
            feedback={false}
            toggleMask
            required
          />
        </div>

        <div className="forgot-password-link">
          <Link
            to="forgot-password"
            className="text-black"
            data-testid="forgot-password"
          >
            Forgot Password?
          </Link>
        </div>
        <div className="p-field-checkbox">
          <Checkbox
            inputId="rememberMe"
            data-testid="remember-me"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.checked)}
          />
          <label
            className="remember-me-label"
            data-testid="remember-me-label"
            htmlFor="rememberMe"
          >
            Remember Me
          </label>
        </div>
        <div className="btn-con">
          {loading ? (
            <span className="text-white" data-testid="loading">
              <svg
                viewBox="0 0 294 295"
                fill="none"
                className={`loader-svg img-loader`}
              >
                <path
                  d="M146.941 293.51C78.9406 293.54 20.2406 247.23 4.13061 179.74C-5.05939 141.3 1.24061 104.73 21.4806 70.7003C26.3606 62.4903 35.0106 60.1703 42.3706 64.7103C49.4406 69.0603 51.4306 77.8303 46.6906 85.7203C33.3906 107.85 27.3606 131.87 30.0906 157.4C34.5506 199.26 55.5306 231.07 92.8106 250.69C160.481 286.31 242.851 248.43 260.951 174.04C276.081 111.83 237.461 47.9503 175.311 33.0203C166.181 30.8303 156.601 30.3603 147.191 29.4803C134.751 28.3203 128.131 16.3503 134.781 6.54033C137.941 1.88033 142.521 0.020334 148.061 0.010334C213.851 -0.179666 273.521 47.2903 289.251 111.49C308.361 189.45 261.711 267.09 186.291 287.88C173.571 291.39 160.201 292.53 147.141 294.77C147.081 294.34 147.011 293.92 146.941 293.51Z"
                  fill="white"
                />
              </svg>{" "}
              Loading
            </span>
          ) : (
            <Button
              disabled={loading}
              id="SignIn"
              data-testid="sign-in"
              label="Sign In"
              className="p-mt-3 text-white "
            />
          )}
        </div>
      </form>
      <Outlet></Outlet>
    </div>
  );
};

export default LoginScreen;
