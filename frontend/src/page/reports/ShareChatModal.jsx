import { Button } from "primereact/button";
import BAutoCompleteWithApi from "../../components/BAutoCompleteWithApi";
import { useFormik } from "formik";
import {
  useListSharedQuery,
  useShareReportMutation,
} from "../../redux/api/reportApi";
import { useLazyGetUsersDataQuery } from "../../redux/api/authAPI";
import { useMemo } from "react";

const ShareBtn = ({ data }) => {
  const chatId = useMemo(() => { return data.id || data.query_id; }, [data]);
  const [shareReport] = useShareReportMutation();
  const { data: listData } = useListSharedQuery(chatId);
  
  const formik = useFormik({
    initialValues: { searchUser: [] },
    onSubmit: (values) => {
      shareReport({
        body: values.searchUser.map((item) => item.code),
        query: `?query_id=${chatId}`,
      });
    },
  });

  const userMapValue = (data) => {
    return data?.map((item) => {
      return { name: `${item.first_name} ${item.middle_name}`, code: item.id };
    });
  };

  return (
    <form onSubmit={formik.handleSubmit}>
      <div className="mt-3">
        <BAutoCompleteWithApi
          variable={{
            id: "searchUser",
            label: "Search User",
            multiple: true,
            isRequire: false,
            type: "text",
          }}
          formik={formik}
          queryParams="search"
          actionApi={useLazyGetUsersDataQuery}
          optionMap={userMapValue}
        ></BAutoCompleteWithApi>
      </div>
      <p className="topic-txt mt-3">Shared with ({listData?.items?.length})</p>
      <div className="d-flex flex-column">
        {listData?.items.map((item, idx) => {
          return (
            <div key={idx} className="border-0 border-bottom py-2">
              <p className="regular-text">
                {item.shared_with_user.first_name}{" "}
                {item.shared_with_user.last_name}
              </p>
              <p className="fw-small text-grey">
                {item.shared_with_user.email_address}
              </p>
            </div>
          );
        })}
      </div>
      <Button
        label="Share Query"
        disabled={formik?.values?.searchUser?.length <= 0}
        className="mx-auto d-flex mt-3"
        type="submit"
      ></Button>
    </form>
  );
};

export default ShareBtn;
