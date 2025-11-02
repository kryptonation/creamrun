import { NavLink, useLocation } from "react-router-dom";
import Img from "./Img";
import { Accordion, AccordionTab } from "primereact/accordion";
import { CREATE_DRIVER_PAYMENT, LEDGER_ENTRY_TYPE } from "../utils/constants";

const Sidebar = () => {
  const location = useLocation();
  const path = (path) => location.pathname.includes(path);

  return (
    <aside className="sidebar scroll-bar" data-testid="side-bar">
      <NavLink
        to="/"
        data-testid="home-link"
        className={({ isActive }) =>
          [
            isActive ? "active" : "",
            "menu-link d-flex align-items-center",
          ].join(" ")
        }
      >
        <Img name="home" className="home-icon"></Img> <span>Home</span>
      </NavLink>
      <Accordion
        // activeIndex={0}
        collapseIcon={() => (
          <Img className="arrow-icon" name="ic_arrow_up"></Img>
        )}
        expandIcon={() => (
          <Img className="arrow-icon" name="ic_arrow_down"></Img>
        )}
      >
        <AccordionTab
          header={
            <span
              className={`menu-link d-flex align-items-center ${path("/new-medallion") || path("/manage-medallion")
                  ? "active"
                  : ""
                }`}
              data-testid="medallion-header"
            >
              <Img name="medallion" className="home-icon"></Img>{" "}
              <span>Medallion </span>
            </span>
          }
          pt={{
            content: { className: "bg-transparent border-0 p-0" },
          }}
        >
          <ul className="bg-transparent sub-link">
            <li>
              <NavLink
                data-testid="manage-owner"
                to="manage-owner"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                Manage Owner
              </NavLink>
              {/* <NavLink
                data-testid="new-medallion-link"
                to="new-medallion"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                New Medallion
              </NavLink> */}
            </li>
            <li>
              <NavLink
                to="manage-medallion"
                data-testid="manage-medallion-link"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                Manage Medallion
              </NavLink>
            </li>
            {/* <li>
              <NavLink
                to="allocate"
                data-testid="allocate-medallion-link"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                Allocate Medallion
              </NavLink>
            </li> */}
          </ul>
        </AccordionTab>
        <AccordionTab
          header={
            <span
              data-testid="vehicle-header"
              className={`menu-link d-flex align-items-center ${path("/new-vehicle") || path("/manage-vehicle") ? "active" : ""
                }`}
            >
              <Img name="car" className="home-icon"></Img>{" "}
              <span>Vehicles </span>
            </span>
          }
          pt={{
            content: { className: "bg-transparent border-0 p-0" },
          }}
        >
          <ul className="bg-transparent sub-link">
            {/* <li>
              <NavLink
                data-testid="new-vehicle-link"
                to="new-vehicle"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                New Vehicle
              </NavLink>
            </li> */}
            <li>
              <NavLink
                to="manage-vehicle"
                data-testid="manage-vehicle-link"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                Manage Vehicle
              </NavLink>
            </li>
            <li>
              <NavLink
                to="manage-vehicle-owner"
                data-testid="manage-vehicle-owner-link"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                Manage Vehicle Owner
              </NavLink>
            </li>
            {/* <li>
              <NavLink
                to="manage-vehicle-ledger"
                data-testid="manage-vehicle-ledger-link"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                Manage Vehicle Ledger
              </NavLink>
            </li> */}
            {/* <li>
              <NavLink
                to="allocate-vehicle"
                data-testid="allocate-vehicle-link"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                Allocate Vehicle
              </NavLink>
            </li> */}
          </ul>
        </AccordionTab>
        <AccordionTab
          header={
            <span
              data-testid="driver-header"
              className={`menu-link d-flex align-items-center ${path("/new-driver") || path("/manage-driver") ? "active" : ""
                }`}
            >
              <Img name="driver" className="home-icon"></Img>{" "}
              <span>Drivers </span>
            </span>
          }
          pt={{
            content: { className: "bg-transparent border-0 p-0" },
          }}
        >
          <ul className="bg-transparent sub-link">
            <li>
              <NavLink
                to="new-driver"
                data-testid="new-driver-link"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                New Driver
              </NavLink>
            </li>
            <li>
              <NavLink
                to="manage-driver"
                data-testid="manage-driver-link"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                Manage Drivers
              </NavLink>
            </li>
          </ul>
        </AccordionTab>

        <AccordionTab
          header={
            <span
              data-testid="lease-header"
              className={`menu-link d-flex align-items-center ${path("/new-lease") || path("/manage-lease") ? "active" : ""
                }`}
            >
              <Img name="lease" className="home-icon"></Img>{" "}
              <span>Leases </span>
            </span>
          }
          pt={{
            content: { className: "bg-transparent border-0 p-0" },
          }}
        >
          <ul className="bg-transparent sub-link">
            <li>
              <NavLink
                data-testid="new-lease-link"
                to="new-lease"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                New Lease
              </NavLink>
            </li>
            <li>
              <NavLink
                to="manage-lease"
                data-testid="manage-lease-link"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                Manage Lease
              </NavLink>
            </li>
          </ul>
        </AccordionTab>
        <AccordionTab
          header={
            <span
              data-testid="trips-header"
              className={`menu-link d-flex align-items-center ${path("/view-trips") ||
                  path("/curb-trips") ||
                  path("/ezpass-trips") ||
                  path("/pvb-trips")
                  ? "active"
                  : ""
                }`}
            >
              <svg
                width="32"
                height="36"
                className="home-icon"
                viewBox="0 0 32 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6.375 34.9502C6.375 34.6505 6.375 34.4296 6.375 34.1457C6.70628 34.1457 6.99023 34.1457 7.27418 34.1457C12.0225 34.1457 16.7866 34.1615 21.5349 34.1299C25.2579 34.1141 28.476 31.4797 29.249 27.8987C30.0535 24.2073 28.2709 20.4844 24.8477 18.9542C23.8065 18.4967 22.5761 18.2759 21.4245 18.2128C19.5157 18.0866 17.5911 18.197 15.6666 18.1654C13.8682 18.1339 12.4642 17.1085 11.9594 15.5152C11.4704 13.9693 12.0067 12.2498 13.3476 11.3348C13.8051 11.0193 14.3888 10.688 14.9251 10.6723C17.9066 10.6091 20.9039 10.6407 23.9485 10.6407C23.9643 10.8931 23.9801 11.114 23.9801 11.3664C23.775 11.3821 23.633 11.4295 23.4753 11.4295C20.825 11.4295 18.1748 11.4137 15.5088 11.4452C14.0575 11.461 12.8428 12.5337 12.6535 13.9062C12.4484 15.4048 13.253 16.7299 14.657 17.1558C15.0671 17.282 15.5404 17.2978 15.9821 17.2978C18.1906 17.3451 20.3991 17.2347 22.5919 17.4398C26.9931 17.8499 30.4321 21.9357 30.2744 26.3528C30.1166 30.9591 26.5041 34.8398 22.024 34.9344C16.8655 35.0291 11.6597 34.9502 6.375 34.9502Z"
                  fill="white"
                />
                <path
                  d="M4.6347 35.3191C2.91521 32.7477 1.25882 30.3026 0.280762 27.5104C-0.366019 25.6647 0.12301 24.0083 1.55855 22.7147C3.02564 21.4054 4.74513 21.1214 6.5435 21.9575C8.29454 22.762 9.2095 24.1976 9.24105 26.1379C9.24105 26.5796 9.16217 27.0371 9.0202 27.4473C7.99481 30.271 6.3542 32.7319 4.6347 35.3191ZM4.6347 33.8204C6.10179 31.4541 7.64776 29.2614 8.32609 26.627C8.45229 26.1537 8.35764 25.57 8.23144 25.081C7.67931 23.0618 5.50234 21.9102 3.49889 22.5412C1.49545 23.1722 0.375413 25.2545 1.05374 27.2264C1.88983 29.5769 3.23072 31.6277 4.6347 33.8204Z"
                  fill="white"
                />
                <path
                  d="M28.1291 11.655C26.804 9.68315 25.4474 7.71125 24.6586 5.43963C24.0907 3.81479 24.6428 2.18995 26.0153 1.19612C27.3246 0.265381 29.1388 0.281157 30.4323 1.22767C31.7574 2.20573 32.42 3.89367 31.7259 5.40808C30.7478 7.56928 29.5489 9.63582 28.4447 11.7339C28.3342 11.7024 28.2396 11.6708 28.1291 11.655ZM28.3027 10.4404C29.2807 8.48424 30.2115 6.74897 30.9845 4.96638C31.4577 3.87789 30.9214 2.64743 29.9433 1.92177C28.9495 1.19612 27.6717 1.14879 26.6305 1.81135C25.6209 2.45813 25.0372 3.67281 25.3527 4.79285C25.9049 6.76474 27.0564 8.45269 28.3027 10.4404Z"
                  fill="white"
                />
                <path
                  d="M25.6008 11.4039C25.3484 11.4039 25.1276 11.4039 24.8594 11.4039C24.8594 11.1515 24.8594 10.9306 24.8594 10.694C25.4904 10.4889 25.7743 10.6309 25.6008 11.4039Z"
                  fill="white"
                />
                <path
                  d="M4.66075 24.0549C5.82811 24.0707 6.72729 25.0014 6.72729 26.1845C6.71151 27.3519 5.76501 28.2826 4.61342 28.2669C3.46183 28.2511 2.54688 27.3046 2.54688 26.1214C2.54687 24.9541 3.49338 24.0391 4.66075 24.0549ZM4.66075 27.3834C5.35485 27.3677 5.90698 26.7998 5.89121 26.1214C5.87543 25.4431 5.27598 24.8752 4.61342 24.891C3.93509 24.9067 3.36718 25.5062 3.38296 26.1845C3.38296 26.8629 3.95086 27.3992 4.66075 27.3834Z"
                  fill="white"
                />
                <path
                  d="M27.2266 4.10005C27.5578 3.8792 27.8891 3.46904 28.2046 3.48482C28.4886 3.50059 28.9145 3.92652 28.9934 4.24202C29.1038 4.71528 28.7252 5.14121 28.2204 5.07811C27.8733 5.03078 27.5578 4.66795 27.2423 4.4471C27.2266 4.33668 27.2266 4.22625 27.2266 4.10005Z"
                  fill="white"
                />
              </svg>{" "}
              <span> Trips </span>
            </span>
          }
          pt={{
            content: { className: "bg-transparent border-0 p-0" },
          }}
        >
          <ul className="bg-transparent sub-link">
            <li>
              <NavLink
                data-testid="view-trips-link"
                to="view-trips"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                View Trips
              </NavLink>
            </li>
            <li>
              <NavLink
                to="curb-trips"
                data-testid="view-curb-data-link"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                View CURB Data
              </NavLink>
            </li>
            <li>
              <NavLink
                to="ezpass-trips"
                data-testid="ezpass-link"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                EZPass
              </NavLink>
            </li>
            <li>
              <NavLink
                to="pvb-trips"
                data-testid="pvb-link"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                PVB
              </NavLink>
            </li>
          </ul>
        </AccordionTab>
        <AccordionTab
          header={
            <span
              className={`menu-link d-flex align-items-center ${path("/procure-insurance") ||
                  path("/claim-insurance") ||
                  path("/manage-insurance") ||
                  path("/manage-claims")
                  ? "active"
                  : ""
                }`}
              data-testid="insurance-header"
            >
              <svg
                width="32"
                height="32"
                className="home-icon"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4.20892 18.3509C6.39379 18.3509 8.45729 18.3509 10.5086 18.3509C12.8149 18.3509 15.1212 18.3509 17.4274 18.3509C17.6338 18.3509 17.8765 18.3023 18.0222 18.3994C18.2407 18.5572 18.5198 18.8243 18.5198 19.0306C18.5077 19.237 18.2043 19.4797 17.9858 19.6375C17.8644 19.7225 17.6338 19.6618 17.4517 19.6618C13.2397 19.6618 9.03992 19.6618 4.82797 19.6618C2.63095 19.6618 1.30789 20.9727 1.29575 23.1576C1.29575 23.546 1.29575 23.9223 1.30789 24.3107C1.35644 25.3061 2.09687 26.0586 3.0922 26.1072C3.75981 26.1436 4.42741 26.1193 5.09501 26.1193C11.6739 26.1193 18.2407 26.1193 24.8196 26.1193C26.4825 26.1193 27.1501 25.4275 27.1865 23.7645C27.2108 22.6478 27.1137 21.5918 26.3247 20.6936C26.0577 20.4022 26.0819 20.0381 26.4097 19.7832C26.7253 19.5283 27.053 19.6011 27.3322 19.8924C28.0847 20.7178 28.4732 21.7132 28.4853 22.8177C28.5096 24.7599 28.5096 26.702 28.4853 28.6441C28.461 30.2099 27.32 31.3266 25.8513 31.3145C24.3826 31.2902 23.3144 30.1371 23.3023 28.5591C23.3023 28.195 23.3023 27.843 23.3023 27.4545C17.2453 27.4545 11.2491 27.4545 5.19211 27.4545C5.19211 27.8672 5.20425 28.2435 5.19211 28.6198C5.14356 30.1856 4.03898 31.3145 2.57026 31.3023C1.10154 31.2902 0.00910365 30.1371 0.00910365 28.5713C-0.00303455 26.6898 -0.00303455 24.8084 0.00910365 22.927C0.0212418 21.2155 0.785948 19.9167 2.21825 18.9821C2.46102 18.8243 2.70378 18.5572 2.82516 18.2902C3.61415 16.4695 4.36671 14.6487 5.11928 12.8159C5.73833 11.3229 6.84291 10.5703 8.45729 10.5703C9.75607 10.5703 11.0427 10.5703 12.3415 10.5703C12.8149 10.5703 13.2397 10.6796 13.2276 11.2379C13.2155 11.7963 12.7906 11.8812 12.3172 11.8812C11.0184 11.8691 9.7318 11.8934 8.43301 11.8691C7.42554 11.857 6.73366 12.2939 6.35738 13.2164C5.64123 14.9158 4.94935 16.5909 4.20892 18.3509ZM24.6132 27.5759C24.6132 27.9522 24.5889 28.3649 24.6132 28.7897C24.6496 29.4573 25.1109 29.9307 25.7421 29.9914C26.4097 30.0521 27.053 29.6637 27.1258 29.0082C27.2108 28.3163 27.138 27.6002 27.138 26.9933C26.3004 27.1996 25.4993 27.3817 24.6132 27.5759ZM3.86905 27.5759C2.97082 27.3696 2.15756 27.1875 1.33217 26.9933C1.33217 26.9933 1.30789 27.0661 1.30789 27.1389C1.30789 27.6852 1.28361 28.2314 1.32003 28.7776C1.35644 29.4938 1.86625 29.9914 2.55812 30.0036C3.27428 30.0157 3.83263 29.518 3.86905 28.7776C3.89333 28.3649 3.86905 27.9401 3.86905 27.5759Z"
                  fill="white"
                />
                <path
                  d="M31.0289 6.42437C31.0289 7.48039 31.1017 8.53642 31.0168 9.5803C30.859 11.4496 30.0336 13.064 28.8076 14.472C27.4239 16.0742 25.7488 17.2881 23.8431 18.1741C23.5518 18.3077 23.1027 18.3319 22.8235 18.1984C20.6508 17.1909 18.7572 15.7951 17.3006 13.8651C16.1111 12.275 15.492 10.5028 15.5163 8.51214C15.5406 6.87349 15.5406 5.23483 15.5163 3.59617C15.5042 3.03782 15.7348 2.7465 16.2446 2.57657C18.4295 1.86041 20.6022 1.09571 22.7871 0.391691C23.1027 0.294586 23.5154 0.294586 23.831 0.40383C26.0037 1.10784 28.1522 1.86041 30.3249 2.57657C30.8711 2.75864 31.1018 3.06209 31.0775 3.64473C31.0411 4.56723 31.0653 5.50187 31.0653 6.43651C31.0532 6.42437 31.0411 6.42437 31.0289 6.42437ZM16.8272 6.78852C16.8272 7.33474 16.8394 7.88096 16.8272 8.42717C16.7665 10.2722 17.3856 11.8744 18.5144 13.2946C19.7283 14.824 21.2698 15.9529 22.9934 16.8511C23.1634 16.936 23.4668 16.9239 23.6489 16.8268C25.1298 16.05 26.465 15.091 27.5938 13.8529C29.014 12.275 29.8272 10.4785 29.7544 8.30579C29.7059 6.97059 29.7301 5.63539 29.7544 4.30019C29.7544 3.9239 29.6694 3.72969 29.281 3.59617C27.3996 2.98926 25.5303 2.3338 23.661 1.71475C23.4547 1.64192 23.1755 1.64192 22.9692 1.70262C21.0513 2.3338 19.1456 2.98926 17.2278 3.62045C16.8758 3.72969 16.8151 3.9239 16.8151 4.2395C16.8394 5.08917 16.8272 5.93884 16.8272 6.78852Z"
                  fill="white"
                />
                <path
                  d="M6.46825 23.5501C5.86134 23.5501 5.25443 23.5501 4.64752 23.5501C4.19841 23.5501 3.88281 23.3559 3.88281 22.8946C3.88281 22.4455 4.19841 22.2513 4.6111 22.2513C5.83706 22.2392 7.07516 22.2392 8.30111 22.2513C8.71381 22.2513 9.02941 22.4576 9.04154 22.8825C9.04154 23.3437 8.73809 23.5501 8.28898 23.5501C7.68207 23.5501 7.07516 23.5501 6.46825 23.5501Z"
                  fill="white"
                />
                <path
                  d="M21.9426 23.5501C21.36 23.5501 20.7774 23.5501 20.1826 23.5501C19.7335 23.5501 19.4179 23.3559 19.43 22.8825C19.43 22.4334 19.7578 22.2513 20.1705 22.2513C21.3964 22.2392 22.6345 22.2392 23.8605 22.2513C24.2732 22.2513 24.5888 22.4576 24.5888 22.8946C24.5888 23.3559 24.2732 23.5622 23.8241 23.5501C23.1929 23.5501 22.5617 23.5501 21.9426 23.5501Z"
                  fill="white"
                />
                <path
                  d="M22.7102 10.2872C23.8755 9.12197 25.0044 7.99311 26.1211 6.86426C26.291 6.69433 26.4609 6.52439 26.6309 6.35446C26.9465 6.03887 27.3106 5.94176 27.6383 6.29377C27.9418 6.60936 27.8568 6.96137 27.5655 7.26482C27.2863 7.55614 26.995 7.83532 26.7158 8.12664C25.587 9.25549 24.4581 10.3843 23.3293 11.5132C22.7466 12.0837 22.4675 12.0715 21.9577 11.4282C21.2172 10.4936 20.4768 9.55894 19.7242 8.63644C19.4329 8.27229 19.2387 7.88387 19.6878 7.53186C20.1369 7.19199 20.4647 7.47117 20.756 7.83532C21.3872 8.63644 22.0305 9.42542 22.7102 10.2872Z"
                  fill="white"
                />
              </svg>{" "}
              <span> Insurance </span>
            </span>
          }
          pt={{
            content: { className: "bg-transparent border-0 p-0" },
          }}
        >
          <ul className="bg-transparent sub-link">
            <li>
              <NavLink
                to="procure-insurance"
                data-testid="procure-insurance-link"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                Procure Insurance
              </NavLink>
            </li>
            <li>
              <NavLink
                to="claim-insurance"
                data-testid="claim-insurance-link"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                Claim Insurance
              </NavLink>
            </li>
            <li>
              <NavLink
                to="manage-insurance"
                data-testid="manage-insurance-link"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                Manage Insurance
              </NavLink>
            </li>
            <li>
              <NavLink
                to="manage-claims"
                data-testid="manage-claims-link"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                Manage Claims
              </NavLink>
            </li>
          </ul>
        </AccordionTab>
        {/* <AccordionTab
          header={
            <NavLink
        to="document"
        data-testid="documents-link"
        className={({ isActive }) =>
          [
            isActive ? "active" : "",
            "menu-link d-flex align-items-center",
          ].join(" ")
        }
      >
        <Img name="document" className="home-icon"></Img>
        <span>Documents</span>
      </NavLink>
          }
          pt={{
            content: { className: "bg-transparent border-0 p-0" },
          }}
        >
        </AccordionTab> */}
      </Accordion>
      <NavLink
        to="document"
        data-testid="documents-link"
        className={({ isActive }) =>
          [
            isActive ? "active" : "",
            "menu-link d-flex align-items-center",
          ].join(" ")
        }
      >
        <Img name="document" className="home-icon"></Img>
        <span>Documents</span>
      </NavLink>
      <Accordion
        collapseIcon={() => (
          <Img className="arrow-icon" name="ic_arrow_up"></Img>
        )}
        expandIcon={() => (
          <Img className="arrow-icon" name="ic_arrow_down"></Img>
        )}
      >
        <AccordionTab
          header={
            <span
              data-testid="complaints-header"
              className={`menu-link d-flex align-items-center ${path("/new-complaints") || path("/manage-complaints")
                  ? "active"
                  : ""
                }`}
            >
              <Img name="complaints" className="complaints-icon"></Img>{" "}
              <span>Complaints</span>
            </span>
          }
          pt={{
            content: { className: "bg-transparent border-0 p-0" },
          }}
        >
          <ul className="bg-transparent sub-link">
            <li>
              <NavLink
                to="new-complaints"
                data-testid="new-complaints-link"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                New Complaints
              </NavLink>
            </li>
            <li>
              <NavLink
                to="manage-complaints"
                data-testid="manage-complaints-link"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                Manage Complaints
              </NavLink>
            </li>
          </ul>
        </AccordionTab>
        <AccordionTab
          header={
            <span
              className={`menu-link d-flex align-items-center ${path("/create-driver-payments") ||
                  path("/manage-driver-payments") ||
                  path("/collect-from-driver")
                  ? "active"
                  : ""
                }`}
              data-testid="payments-header"
            >
              <Img name="payments" className="payments-icon"></Img>{" "}
              <span>Payments</span>
            </span>
          }
          pt={{
            content: { className: "bg-transparent border-0 p-0" },
          }}
        >
          <ul className="bg-transparent sub-link">
            {/* <li>
              <NavLink
                to={`create-driver-payments/${CREATE_DRIVER_PAYMENT}`}
                data-testid="create-driver-payments-link"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                Create Driver Payments
              </NavLink>
            </li> */}
            <li>
              <NavLink
                to="manage-driver-payments"
                data-testid="manage-driver-payments-link"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                Manage Driver Payments
              </NavLink>
            </li>
            <li>
              <NavLink
                to="collect-from-driver"
                data-testid="collect-from-driver-link"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                Collect From Driver
              </NavLink>
            </li>
            <li>
              <NavLink
                // to="ledger-entry"
                to={`ledger-entry/${LEDGER_ENTRY_TYPE}`}
                data-testid="ledger-entry-link"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                Ledger Entry
              </NavLink>
            </li>
            <li>
              <NavLink
                to="manage-ledger-entry"
                data-testid="manage-ledger-entry-link"
                className={({ isActive }) =>
                  [
                    isActive ? "active" : "",
                    "menu-link d-flex align-items-center ",
                  ].join(" ")
                }
              >
                Manage Ledger Entry
              </NavLink>
            </li>
          </ul>
        </AccordionTab>
      </Accordion>
      <NavLink
        to="reports"
        data-testid="reports-link"
        className={({ isActive }) =>
          [
            isActive ? "active" : "",
            "menu-link d-flex align-items-center",
          ].join(" ")
        }
      >
        <Img className="home-icon" name="report"></Img>
        <span>Reports</span>
      </NavLink>
      <NavLink
        to="miscellaneous"
        data-testid="miscellaneous-link"
        className={({ isActive }) =>
          [
            isActive ? "active" : "",
            "menu-link d-flex align-items-center",
          ].join(" ")
        }
      >
        <Img className="home-icon" name="miscellaneous"></Img>
        <span>Miscellaneous</span>
      </NavLink>
    </aside>
  );
};

export default Sidebar;
