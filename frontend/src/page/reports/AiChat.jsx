import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BBreadCrumb from "../../components/BBreadCrumb";
import { Button } from "primereact/button";
import Img from "../../components/Img";
import { Divider } from "primereact/divider";
import DataTableComponent from "../../components/DataTableComponent";
import {
  useGenerateReportMutation,
  useMakeFavReportMutation,
} from "../../redux/api/reportApi";
import "./_reports.scss";
import { Dialog } from "primereact/dialog";
import ShareBtn from "./ShareChatModal";
import ChatSideBar from "./ChatSideBar";
import { formatLabel } from "../../utils/gridUtils";

const AiChat = () => {
  const items = [
    {
      template: () => (
        <Link to="/" className="font-semibold text-grey">
          {" "}
          Home{" "}
        </Link>
      ),
    },
    {
      template: () => (
        <Link to="/reports" className="font-semibold text-grey">
          {" "}
          Reports{" "}
        </Link>
      ),
    },
    {
      template: () => (
        <Link to={`/reports`} className="font-semibold text-black">
          {" "}
          BAT AI{" "}
        </Link>
      ),
    },
  ];
  const [visible, setVisible] = useState(false);
  const [fav, setFav] = useState(false);
  const [rows, setRows] = useState(5);
  const [page, setPage] = useState(1);
  const [isChatHistoryVisible, setIsChatHistoryVisible] = useState(true);
  const [isEmpty, setIsEmpty] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [triggerGenerateReport, { data, isSuccess, reset }] =
    useGenerateReportMutation();
  const [triggerFav] = useMakeFavReportMutation();
   const [filterSearchBy, setFilterSearchBy] = useState(false);
  

  const headerElement = (
    <div className="inline-flex align-items-center justify-content-center gap-2">
      <p className="topic-txt fw-normal ">Share Query</p>
      <p className="regular-text  fw-normal ">
        Vehicles due for inspection this month.
      </p>
    </div>
  );

  const triggerSearch = ({ page = 1, limit = 5, query_id, searchValue,filterData }) => {
    const queryParams = new URLSearchParams({
      page,
      per_page: limit,
    });

    if (query_id) {
      queryParams.append("query_id", query_id);
    }

    triggerGenerateReport({
      query: `?${queryParams}`,
      payload: {
        payload: {
          prompt: searchValue,
        },
        filters:{
          ...filterData
        }
      },
    });
  };

  const searchForm = (e) => {
    e.preventDefault();
    if (searchValue === "") {
      // setIsEmpty(true);
    } else {
      // setIsEmpty(false);
      triggerSearch({ page, limit: rows, searchValue });
    }
  };

  useEffect(() => {
    if (isSuccess) {
      setIsEmpty(false);
    }
  }, [isSuccess]);

  const columns = useMemo(() => {
    setFav(data?.favorite);
    return data?.columns?.map((item) => {
      return {
        field: item,
        header: formatLabel(item),
        dataTestId: `${item}Header`,
        sortable: false,
        filter: false,
      };
    });
  }, [data]);

  const searchData = (type, value) => {
    // const queryParams = new URLSearchParams();
    // queryParams.append();
    // setFilterSearchBy(type.field);
    // triggerSearch(queryParams);
    triggerSearch({ page, limit: rows, searchValue,filterData:{[type.field]: value} });
  };

  const filterData = useCallback(() => {
    if (data?.columns) {
      return (
        data.columns.reduce((acc, item) => {
          acc[item] = {
            value: "",
            matchMode: "customFilter",
            label: formatLabel(item),
            data: [],
            formatType: "Search",
          };
          return acc;
        }, {})
      );
    }
  }, [data]);

  const customRender = (column, rowData) => {
    return rowData[column.field];
  };

  const favHandler = (data) => {
    triggerFav(data)
      .unwrap()
      .then((data) => setFav(data?.favorite));
  };

  const onPageChange = (data) => {
    setPage(Number(data.page) + 1);
    setRows(data.rows);
    triggerSearch({
      page: Number(data.page) + 1,
      limit: data.rows,
      query_id: "",
      searchValue,
    });
  };

  const createNewChat = () => {
    setIsEmpty(true);
    reset();
    // setSearchValue("");
  };

  const chatHistoryClickHandle = (data) => {
    setSearchValue(data.prompt);
    return triggerSearch({ query_id: data.id, searchValue: "" });
  };

  return (
    <section
      data-testid="ai-chat-screen"
      className="ai-chat-screen w-100 h-100 d-flex flex-column gap-2"
    >
      <div className="chat-main w-100 h-100 d-flex ">
        <div
          className={`chat-container ${
            isChatHistoryVisible ? "active" : ""
          } flex-grow-1 d-flex flex-column`}
          data-testid="chat-cont"
        >
          <div className="" data-testid="chat-header">
            <BBreadCrumb breadcrumbItems={items} separator={"/"} />
            <div className="d-flex align-items-center justify-content-between">
              <p className="topic-txt" data-testid="topic">
                BAT AI
              </p>
              {!isEmpty && (
                <div className="d-flex align-items-center justify-content-between gap-3 share-container">
                  <Button
                    type="button"
                    className="fav-btn"
                    data-testid="fav-btn"
                    onClick={() => favHandler(data?.query_id)}
                    icon={() => <Img name={fav ? "fav_filled" : "fav"} />}
                  />
                  <Divider layout="vertical" />
                  <Button
                    type="button"
                    className="share-btn"
                    onClick={() => setVisible(true)}
                    data-testid="share-btn"
                    icon={() => <Img name="share" />}
                  />
                  <Dialog
                    visible={visible}
                    header={headerElement}
                    style={{ width: "50vw" }}
                    onHide={() => {
                      if (!visible) return;
                      setVisible(false);
                    }}
                  >
                    <ShareBtn data={data}></ShareBtn>
                  </Dialog>
                </div>
              )}
            </div>
          </div>
          <div className="chat-body position-relative d-flex flex-column flex-grow-1 overflow-auto scroll-bar">
            {isEmpty ? (
              <div
                className="new-chat d-flex align-items-center justify-content-center flex-column flex-grow-1 pb-5"
                data-testid="new-chat-con"
              >
                <img
                  src="/assets/images/logo.png"
                  data-testid="bat-logo"
                  className="pb-3"
                  alt=""
                />
                <p className="topic-txt">Start Smart with BAT AI</p>
                <p className="fw-small">
                  Ask, analyze, and act — Big Apple Taxi’s AI helps you manage
                  your fleet smarter.
                </p>
              </div>
            ) : (
              <div
                className="chat-body d-flex flex-column flex-grow-1  gap-2"
                data-testid="main-chat-interface"
              >
                <div className="user-chat ms-auto" data-testid="user-chat">
                  <p className="border rounded-5 w-max-content regular-text px-3 py-1 ">
                    {searchValue}
                  </p>
                </div>
                <div className="ai-response-chat " data-testid="ai-response">
                  {/* <div className="d-flex align-items-center justify-content-between">
                    <Button
                      text
                      type="button"
                      className="fav-btn gap-2 fw-normal regular-text"
                      data-testid="fav-btn"
                      label="Export"
                      icon={() => <Img name="pdf" />}
                    />
                  </div> */}
                  <DataTableComponent
                    data={data?.rows}
                    rows={rows}
                    renderColumn={customRender}
                    filterData={filterData()}
                    totalRecords={data?.total_count}
                    onPageChange={onPageChange}
                    searchData={searchData}
                    columns={columns}
                  />
                </div>
              </div>
            )}
            <div className="position-sticky bottom-0 bg-white">
              <form
                action=""
                data-testid="search-form"
                className="search-form d-flex align-items-center my-1"
                method="post"
                onSubmit={searchForm}
              >
                <input
                  type="search"
                  data-testid="search-input"
                  placeholder="Start interacting"
                  onChange={(e) => setSearchValue(e.target.value)}
                  value={searchValue}
                  disabled={isSuccess}
                  className="search-input flex-grow-1 px-2 regular-text"
                />
                <Button
                  disabled={searchValue == "" || isSuccess}
                  type="submit"
                  className="bg-black rounded-circle submit-btn"
                  data-testid="submit-btn"
                  icon={() => <Img name="up-arrow" />}
                />
              </form>
            </div>
          </div>
        </div>
        <ChatSideBar
          newChat={createNewChat}
          chatHistoryClickHandle={chatHistoryClickHandle}
          setIsChatHistoryVisible={setIsChatHistoryVisible}
          isChatHistoryVisible={isChatHistoryVisible}
          isSuccess={isSuccess}
        ></ChatSideBar>
      </div>
    </section>
  );
};

export default AiChat;
