import BBreadCrumb from "../../components/BBreadCrumb";
import { Link, useNavigate } from "react-router-dom";
import Img from "../../components/Img";
import "./_b-miscellaneous.scss";
import { useEzpassUploadMutation } from "../../redux/api/ezpassApi";
import { usePvbUploadMutation } from "../../redux/api/pvbApi";
import MiscellaneousUpload from "./MiscellaneousUpload";
import { CREATE_CORRESPONDENCE_TYPE } from "../../utils/constants";
import CreateCaseModal from "./CreateCaseModal";

const Miscellaneous = () => {
  const items = [
    {
      template: () => (
        <Link to="/" data-testid="home" className="font-semibold text-grey">
          Home
        </Link>
      ),
    },
    {
      template: () => (
        <Link
          to="/miscellaneous"
          data-testid="miscellaneous"
          className="font-semibold text-black"
        >
          Miscellaneous
        </Link>
      ),
    },
  ];
  const cardData = [
    {
      lable:
        "The agency of the New York City government that licenses and regulates the medallion taxis and for-hire vehicle industries.",
      img: "tlc",
      dataTestId: "tlc-cont",
    },
    {
      lable:
        "A government agency that administers motor vehicle registration and driver licensing.",
      img: "dmv",
      dataTestId: "dmv-cont",
    },
    {
      lable:
        "The electronic toll collection system used on toll roads, toll bridges, and toll tunnels.",
      img: "ezpass",
      dataTestId: "ezpass-cont",
      links: [
        {
          url: "/",
          type: "upload",
          name: "EZPass",
          action: useEzpassUploadMutation,
          lable: "Import EZPass",
          dataTestId: "import-ezpass",
        },
        {
          url: "manage-ezpass",
          lable: "Manage EZPass",
          dataTestId: "manage-ezpass",
        },
        {
          url: "view-ezpass",
          lable: "View Log",
          dataTestId: "view-log",
        },
      ],
    },
    {
      lable:
        "The agency of the New York City government that licenses and regulates the medallion taxis and for-hire vehicle industries.",
      img: "",
      dataTestId: "pvb-cont",
      title: {
        img: "PVB",
        label: "PVB",
      },
      links: [
        {
          url: "/",
          type: "upload",
          name: "PVB",
          action: usePvbUploadMutation,
          dataTestId: "import-pvb",
          lable: "Import PVB Data",
        },
        {
          url: "manage-pvb",
          lable: "Manage PVB Data",
          dataTestId: "manage-pvb",
        },
        {
          url: "view-pvb",
          lable: "View Log",
          dataTestId: "view-log",
        },
      ],
    },
    {
      lable: "View and Create your Correspondence here.",
      img: "",
      dataTestId: "correspondence-cont",
      title: {
        img: "corresponding",
        label: "Correspondence",
      },
      links: [
        {
          url: "/miscellaneous/create-correspondence",
          type: "createCase",
          caseType: CREATE_CORRESPONDENCE_TYPE,
          lable: "Create Correspondence",
          title: "Create Correspondence",
          message: "Are you sure you want to create a new correspondence?",
          navigateURl: "/miscellaneous/create-correspondence",
          dataTestId: "create-cor",
        },
        {
          url: "/miscellaneous/manage-correspondence",
          lable: "Manage Correspondence",
          dataTestId: "manage-cor",
        },
      ],
    },
    {
      lable: "View and Create your Audit Trail here.",
      img: "",
      dataTestId: "audit-trail-cont",
      title: {
        img: "audit_trail",
        label: "Audit Trail",
      },
      links: [
        {
          url: "/",
          lable: "View Audit Trail",
          dataTestId: "view-audit-trail",
        },
        {
          url: "/",
          lable: "Manage Audit Trail",
          dataTestId: "manage-audit-trail",
        },
      ],
    },
    {
      lable: "View and Configure your notification, Lease.",
      img: "",
      dataTestId: "config-notify-cont",
      title: {
        img: "setting",
        label: "Configurator",
      },
      links: [
        {
          url: "notification",
          lable: "Configure Notifications",
          dataTestId: "config-notification",
        },
        {
          url: "lease-config",
          lable: "Configure Lease",
          dataTestId: "config-lease",
        },
      ],
    },
    {
      lable: "View and Manage users and roles",
      img: "",
      dataTestId: "user-roles",
      title: {
        img: "user-role",
        label: "User Role Management",
      },
      links: [
        {
          url: "manage-user-role",
          lable: "Manage User Roles",
          dataTestId: "manage-user-role",
        },
      ],
    },
  ];


  return (
    <div className="common-layout w-100 h-100 d-flex flex-column miscellaneous-screen">
      <BBreadCrumb breadcrumbItems={items} separator={"/"} />
      <p className="topic-txt">Miscellaneous</p>
      <p className="regular-text text-grey">Showing 08 of 08 Lists... </p>
      <div className="w-80 miscellaneous-card-con">
        {cardData.map((item, idx) => {
          return (
            <div
              key={idx}
              data-testid={item.dataTestId}
              className="shadow col miscellaneous-card d-flex flex-column gap-3"
            >
              {item.img && (
                <img
                  src={require(`../../assets/${item.img}.webp`)}
                  className={`${item.img} top-icon`}
                />
              )}
              {item?.title && (
                <div className="d-flex gap-2 align-items-center title">
                  <Img name={item?.title?.img}></Img>
                  <p className="regular-semibold-text">{item?.title?.label}</p>
                </div>
              )}
              <p className="regular-text">{item.lable}</p>
              <div className="d-flex flex-column gap-2">
                {item?.links?.map((link, idx) => {
                  if (link.type === "upload") {
                    return (
                      <MiscellaneousUpload
                        link={link}
                        dataTestId={link?.dataTestId}
                        key={idx}
                      />
                    );
                  }
                  if (link.type === "createCase") {
                    return (
                      <CreateCaseModal key={idx} link={link}></CreateCaseModal>
                    );
                  }
                  return (
                    <Link
                      key={idx}
                      to={link.url}
                      data-testid={link?.dataTestId}
                      className="fw-small text-blue"
                    >
                      {link.lable}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {/* </div> */}
    </div>
  );
};

export default Miscellaneous;
