import AiChat from "../AiChat";
import { BrowserRouter as Router } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { legacy_createStore as createStore } from "redux";
import {
  useGenerateReportMutation,
  useLazyGetHistoryReportQuery,
  useMakeFavReportMutation,
} from "../../../redux/api/reportApi";

jest.mock("../../../redux/api/reportApi", () => ({
  useLazyGetHistoryReportQuery: jest.fn(() => ([jest.fn(),{}])),
  useMakeFavReportMutation: jest.fn(() => [jest.fn(), {}]),
  useGenerateReportMutation: jest.fn(() => [jest.fn(), {}]),
}));
const historyData = {
  id: 47,
  prompt: "medallion expire",
  validated_sql:
    "```sql\nSELECT \n    m.medallion_number,\n    m.medallion_type,\n    m.medallion_status,\n    m.medallion_renewal_date,\n    m.validity_start_date,\n    m.validity_end_date\nFROM \n    medallions m\nWHERE \n    m.is_active = 1 \n    AND m.is_archived = 0\nORDER BY \n    m.validity_end_date ASC;\n```",
  execution_status: "SUCCESS",
  executed_at: "2025-05-19T16:24:57",
  rows_returned: 20,
  columns_returned: [
    "medallion_number",
    "medallion_type",
    "medallion_status",
    "medallion_renewal_date",
    "validity_start_date",
    "validity_end_date",
  ],
  favorite: false,
  is_shared: false,
  exported_formats: [
    {
      url: "",
      format: "pdf",
    },
    {
      url: "",
      format: "xls",
    },
  ],
  created_on: "2025-05-19T10:54:57",
};

// Minimal reducer for store
const reducer = (state = {}) => state;

describe("BAT AI Component", () => {
  let store;

  const mockData = {
    rows: [
      { medallion_number: "5N65", medallion_type: "Wav" },
      { medallion_number: "6F25", medallion_type: "Wav" },
    ],
    columns: ["medallion_number", "medallion_type"],
    total_count: 2,
  };

  const renderWithProviders = (ui) => {
    return render(
      <Provider store={store}>
        <Router
          future={{
            v7_relativeSplatPath: true,
            v7_startTransition: true,
          }}
        >
          {ui}
        </Router>
      </Provider>
    );
  };
  beforeEach(() => {
    store = createStore(reducer, {
      medallion: {
        selectedMedallionDetail: {},
      },
    });
    useGenerateReportMutation.mockReturnValue([
      jest.fn(),
      { data: { items: [], total_items: 0 } },
    ]);
    useMakeFavReportMutation.mockReturnValue([
      jest.fn(),
      { data: { items: [], total_items: 0 } },
    ]);
    useLazyGetHistoryReportQuery.mockReturnValue([jest.fn(),{ data: [{ ...historyData }] }]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("Should BAT AI text render successfully", () => {
    renderWithProviders(<AiChat />);
    const topicElement = screen.getByTestId("topic");
    expect(topicElement).toBeInTheDocument();
    expect(topicElement).toHaveTextContent("BAT AI");
  });

  it("Should empty screen with bat logo display successfully", () => {
    renderWithProviders(<AiChat />);
    expect(screen.getByTestId("new-chat-con")).toBeInTheDocument();
    expect(screen.queryByTestId("main-chat-interface")).toBeNull();
  });

  it("Render the search form correctly", () => {
    renderWithProviders(<AiChat />);
    expect(screen.getByTestId("search-form")).toBeInTheDocument();
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
    expect(screen.getByTestId("submit-btn")).toBeInTheDocument();
    expect(screen.getByTestId("submit-btn")).toBeDisabled();
  });

  it("enable the submit button when input ha values", () => {
    renderWithProviders(<AiChat />);
    const input = screen.getByTestId("search-input");
    const submitButton = screen.getByTestId("submit-btn");
    fireEvent.change(input, { target: { value: "medallion WAV type" } });
    expect(submitButton).not.toBeDisabled();
  });

  it("Calls the API when form is submitted with valid input value", async () => {
    const mockTrigger = jest.fn();
    useGenerateReportMutation.mockReturnValue([
      mockTrigger,
      { data: { mockData } },
    ]);
    renderWithProviders(<AiChat />);
    const input = screen.getByTestId("search-input");
    const form = screen.getByTestId("search-form");
    fireEvent.change(input, { target: { value: "medallion WAV type" } });
    fireEvent.submit(form);
    await waitFor(() => {
      expect(mockTrigger).toHaveBeenCalledWith(
        expect.objectContaining({
          query: "",
          payload: {
            payload: {
              prompt: "medallion WAV type",
            },
          },
        })
      );
    });
  });
});
