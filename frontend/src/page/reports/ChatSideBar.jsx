import { Button } from "primereact/button";
import { useEffect, useState } from "react";
import Img from "../../components/Img";
import HistorySearch from "./HistorySearch";
import ChatHistoryCard from "./ChatHistoryCard";
import { useLazyGetHistoryReportQuery } from "../../redux/api/reportApi";
import { useInfiniteScroll } from "../../hooks/useInfiniteScroll";
import { yearMonthDate } from "../../utils/dateConverter";

const ChatSideBar = ({
  newChat,
  chatHistoryClickHandle,
  isChatHistoryVisible,
  setIsChatHistoryVisible,
  isSuccess
}) => {
  const toggleSiderBar = () => setIsChatHistoryVisible(!isChatHistoryVisible);
  const [historyDataArray, setHistoryDataArray] = useState([]);
  const [triggerHistory, { data }] = useLazyGetHistoryReportQuery();
  const [dates, setDates] = useState(null);
  const [checked, setChecked] = useState(false);
  const { page, lastElementRef, resetPage,handleDataLoaded } = useInfiniteScroll({
    totalPages: data?.total_pages,
  });

  const triggerHistorySearch = async ({
    page = 1,
    limit = 5,
    dates,
    isFilter,
    checked
  }) => {
    const queryParams = new URLSearchParams({
      page,
      per_page: limit,
    });

    if (dates) {
      queryParams.append("from_date", yearMonthDate(dates[0]));
      queryParams.append("to_date", yearMonthDate(dates[1]));
    }
    if(checked){
      queryParams.append("favorite", true);
    }

    await triggerHistory(`?${queryParams.toString()}`)
      .unwrap()
      .then((item) => {
        handleDataLoaded()
        if (isFilter) {
          return setHistoryDataArray([...item.items]);
        }
        setHistoryDataArray([...historyDataArray, ...item.items]);
      });
  };

  useEffect(() => {
    console.log(page);
    triggerHistorySearch({ page, limit: 10, dates });
  }, [page,isSuccess]);
  useEffect(() => {
    if(isSuccess){
      clearAllFilter()
    }
  }, [isSuccess]);

  const handleFilterApply = () => {
    resetPage();
    setHistoryDataArray([]);
    triggerHistorySearch({ page: 1, limit: 10, dates, isFilter: true,checked:checked });
  };

  const clearAllFilter = () => {
    setDates(null);
    setHistoryDataArray([]);
    setChecked(false);
    resetPage();
    triggerHistorySearch({ page: 1, limit: 10, isFilter: true,checked:false });
  };

  const newChatCreate=()=>{
    newChat();
    clearAllFilter()
  }

  return (
    <div
      className={`chat-history ${isChatHistoryVisible ? "active" : ""}`}
      data-testid="chat-history"
    >
      <Button
        data-testid="toggle-btn"
        onClick={toggleSiderBar}
        className="toggle-btn"
        icon={() => <Img name="chat-toggle-arrow"></Img>}
      ></Button>
      <div
        className={`chat-history-main position-relative h-100 d-flex flex-column ${
          isChatHistoryVisible ? "active " : ""
        }`}
      >
        <p
          data-testid="chat-history-header "
          className="chat-history-header topic-txt"
        >
          My Queries
        </p>
        <div className="chat-history-body  d-flex flex-column flex-grow-1 h-100">
          <HistorySearch
            {...{ dates, setDates, handleFilterApply, clearAllFilter,checked, setChecked }}
          />
          <div className="d-flex flex-column mb-5 pb-5 flex-grow-1 scroll-bar overflow-auto">
            {historyDataArray?.map((item, index) => {
              const isLastElement = index === historyDataArray.length - 1;
              return (
                <ChatHistoryCard
                  ref={isLastElement ? lastElementRef : null}
                  key={index}
                  data={item}
                  onClick={chatHistoryClickHandle}
                />
              );
            })}
            {historyDataArray.length === 0 && (
              <p className="regular-text my-3 ">No chat history found</p>
            )}
          </div>
        </div>
        <Button
          data-testid="new-chat-btn"
          className="position-sticky regular-text bottom-0 py-3 w-100 d-flex align-items-center justify-content-center gap-2"
          label="New Chat"
          onClick={newChatCreate}
          pt={{
            label: {
              className: "my-label-class",
            },
          }}
          icon={() => <Img name="add"></Img>}
        ></Button>
      </div>
    </div>
  );
};

export default ChatSideBar;
