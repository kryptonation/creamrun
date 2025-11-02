import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { useEffect, useRef, useState } from "react";
import Img from "./Img";
import { Menu } from "primereact/menu";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { clearUser, setUser } from '../redux/slice/userSlice';
import { authApi, useFetchUserQuery, useLogoutMutation } from '../redux/api/authAPI';
import { medallionApi } from "../redux/api/medallionApi";
import { logoutUser } from "../redux/slice/authSlice";

const Header = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [logout] = useLogoutMutation();

  const menuRef = useRef();

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch (e) {
      console.log(e)
    }
    dispatch(clearUser());
    dispatch(logoutUser());
    dispatch(medallionApi.util.resetApiState());
    dispatch(authApi.util.resetApiState());
    // localStorage.removeItem('isLoggedIn');
    // console.log('Logout successful');

    navigate('/login');
  };

  const menuItems = [
    {
      template: () => (
        <button type="button" data-testid="profile" className="d-flex align-items-center w-100 btn gap-2 border-0 " >
          <Img name="ic_profile" />Profile
        </button>
      ), command: () => { }
    },
    {
      template: () => (
        <button type="button" data-testid="log-out" className="d-flex align-items-center w-100 btn gap-2 border-0 " onClick={handleLogout}>
          <Img name="ic_logout" /> Log out
        </button>
      ), command: handleLogout,

    },
  ];
  const [selectedSearch, setSelectedSearch] = useState({
    name: "Medallion Owner",
    code: "a",
  });
  const [value, setValue] = useState("");

  const search = [
    { name: "Medallion Owner", code: "a" },
    { name: "Medallion", code: "sa" },
    { name: "Driver", code: "ac" },
    { name: "Vehicle", code: "ac" },
  ];
  // const storedLoginStatus = localStorage.getItem('isLoggedIn') === 'true';

  const { data: user, isSuccess } = useFetchUserQuery();

  useEffect(() => {
    if (isSuccess && user) {
      dispatch(
        setUser({
          isLoggedIn: true,
          user,
        })
      );
    }
  }, [isSuccess, user, dispatch]);


  return (
    <header className="d-flex align-items-center justify-content-between w-100 ">
      <a href="/" className="d-flex align-items-end text-black logo">
        <img src="/assets/images/logo.png" alt="" />
        DISPATCH PLATFORM
      </a>
      <div className="advance-search-con d-flex align-items-center split-con regular-text">
        <Dropdown
          value={selectedSearch}
          onChange={(e) => setSelectedSearch(e.value)}
          options={search}
          optionLabel="name"
          placeholder="Select a City"
          className="bg-transparent border-0 text-small child regular-text"
        />
        <IconField iconPosition="right" className="d-flex align-items-center justify-content-center flex-grow-1 child">
          <InputIcon>
            <Img name="search"></Img>
          </InputIcon>
          <InputText
            className="border-0 w-100 border-radius-30"
            placeholder="Search for Medallion Owner Name / ID / SSN / EIN"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </IconField>
      </div>
      <div className="d-flex gap-4 align-items-center setting-con">
        <Button
          text
          data-testid="notification"
          className="notify-btn"
          icon={() => (
            <Img name="notification"></Img>
          )}
        />
        <Menu model={menuItems} popup ref={menuRef} />
        <button type="button" data-testid="user-name-drop-down" className="btn border-0" onClick={(event) => menuRef.current.toggle(event)}>
          <span style={{ paddingRight: 10 }}>{user?.first_name}</span> <Img name='ic_down_arrow' />
        </button>
      </div>
    </header>
  );
};

export default Header;
