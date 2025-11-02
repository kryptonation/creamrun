import { lazy, Suspense } from "react";
import { PrimeReactProvider } from "primereact/api";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store";
import "primereact/resources/themes/bootstrap4-light-blue/theme.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/style.scss";
import { pdfjs } from "react-pdf";
import Login from "./page/login";
import ProtectedRoute from "./components/ProtectedRoute";
import IndividualTrip from "./page/trips/IndividualTrip";
import ViewPvbLog from "./page/miscellaneous/pvb/ViewPvbLog";
import ViewEzpassLog from "./page/miscellaneous/ezpass/ViewEzpassLog";
import ViewCrub from "./page/trips/ViewCrub";
import CollectSearchDriver from "./page/payments/collectFromtDriver/CollectSearchDriver";
import EnterPaymentDriverDetails from "./page/payments/collectFromtDriver/EnterPaymentDriverDetails";
import ViewDriverSubmitReceipt from "./page/payments/collectFromtDriver/ViewDriverSubmitReceipt";
import EnterDriverRecipt from "./page/payments/collectFromtDriver/EnterDriverRecipt";
import ChoosePayPeriod from "./page/payments/createDriverPayment/ChoosePayPeriod";
import CaseCreateModal from "./page/home/CaseCreateModal";
import AiChat from "./page/reports/AiChat";
import ViewEzpassDetail from "./page/miscellaneous/ezpass/ViewEzpassDetail";
import MangeCorrespondence from "./page/miscellaneous/correspondence";
import Createcorrespondence from "./page/miscellaneous/correspondence/Createcorrespondence";
import ManageLeaseDocLayout from "./page/manageLease/ManageLeaseDocLayout";
import ViewPvbDetail from "./page/miscellaneous/pvb/ViewPvbDetail";
import LedgerSearchDriver from "./page/payments/ledgerEntry/LedgerSearchDriver";
import LedgerEntryDetail from "./page/payments/ledgerEntry/LedgerEntryDetail";
import ManageDriverPayments from "./page/payments/manageDriverPayments";
import CreateIndividualOwner from "./page/newMedallion/CreateIndividualOwner";
import ManageOwner from "./page/manageOwner";
import EditVehicleOwner from "./page/manageVehicleOwner/EditVehicleOwner";
import ViewVehicleOwnerDetails from "./page/view/ViewVehicleOwnerDetail";
import ViewDriverDetails from "./page/view/ViewDriverDetails";
import ViewLeaseDetails from "./page/view/ViewLeaseDetails";
import ViewOwner from "./page/view/ViewOwner";
import ViewVehicleDetails from "./page/view/ViewVehicleDetails";
const CaseIdProtect = lazy(() => import("./page/newMedallion/CaseIdProtect"));
const CaseProtected = lazy(() => import("./page/home/CaseProtected"));
const NewVehicle = lazy(() => import("./page/newVehicle"));
const ManageVehicle = lazy(() => import("./page/mangeVehicle"));
const ComingSoon = lazy(() => import("./page/ComingSoon"));
const NotFound = lazy(() => import("./page/NotFound"));
const ErrorBoundary = lazy(() => import("./components/ErrorBoundary"));
const NewMedDocLayout = lazy(() =>
  import("./page/newMedallion/NewMedDocLayout")
);
const ManageDriverDocLayout = lazy(() =>
  import("./page/mangeDriver/ManageDriverDocLayout")
);
const NewLease = lazy(() => import("./page/newLease"));
const ManageLease = lazy(() => import("./page/manageLease"));
const AttachVechile = lazy(() => import("./page/medallion/AttachVechile"));
const ManageVehicleDocLayout = lazy(() =>
  import("./page/mangeVehicle/ManageVehicleDocLayout")
);
const EsignConfirmation = lazy(() => import("./page/home/EsignConformation"));
const LeaseTerminate = lazy(() => import("./page/mangeDriver/LeaseTerminate"));
const Notification = lazy(() => import("./page/miscellaneous/Notification"));
const LeaseConfig = lazy(() =>
  import("./page/miscellaneous/lease/LeaseConfig")
);
const PersonalInfo = lazy(() =>
  import("./page/miscellaneous/manageUser/PersonalInfo")
);
const ManageUserRole = lazy(() =>
  import("./page/miscellaneous/manageUser/ManageUserRole")
);
const Miscellaneous = lazy(() => import("./page/miscellaneous"));
const VehicleRepairDetail = lazy(() =>
  import("./page/mangeVehicle/VehicleRepairDetail")
);
const ManageAuditTrail = lazy(() => import("./page/home/ManageAuditTrail"));
const ViewMedallion = lazy(() => import("./page/view/ViewMedallion"));
const ViewInspection = lazy(() =>
  import("./page/mangeVehicle/inspection/ViewInspection")
);
const ViewInspectionDetail = lazy(() =>
  import("./page/mangeVehicle/inspection/ViewInspectionDetail")
);
const ManageMedallionDocLayout = lazy(() =>
  import("./page/manage/ManageMedallionDocLayout")
);
const ForgotPassword = lazy(() => import("./page/login/ForgotPassword"));
const LoginScreen = lazy(() => import("./page/login/LoginScreen"));
const ToastWrapper = lazy(() => import("./page/ToastWrapper"));
const ManageEzpass = lazy(() => import("./page/miscellaneous/ezpass"));
const ManagePVB = lazy(() => import("./page/miscellaneous/pvb"));
const ViewTrips = lazy(() => import("./page/trips/ViewTrips"));
const Home = lazy(() => import("./page/home"));
const Layout = lazy(() => import("./page/Layout"));
const Manage = lazy(() => import("./page/manage"));
const NewDrivers = lazy(() => import("./page/newDriver"));
const MangeDrivers = lazy(() => import("./page/mangeDriver"));
const NewMedallion = lazy(() => import("./page/newMedallion"));
const ManageLedgerEntry = lazy(() =>
  import("./page/payments/manageLedgerEntry")
);
const EditLedgerEntry = lazy(() =>
  import("./page/payments/manageLedgerEntry/EditLedgerEntry")
);
const ViewLedger = lazy(() =>
  import("./page/payments/manageLedgerEntry/ViewLedger")
);
const ViewLedgerDetails = lazy(() => import("./page/view/ViewLedgerDetails"));
const ManageVehicleOwner = lazy(() => import("./page/manageVehicleOwner"));
const ManageMedallionOwnerDocLayout = lazy(() =>
  import("./page/manageOwner/ManageMedallionOwnerDocLayout")
);
const ManageVehicleLedger = lazy(() => import("./page/manageVehicleLedger"));

// pdfjs.GlobalWorkerOptions.workerSrc = new URL(
//   "pdfjs-dist/build/pdf.worker.min.mjs",
//   import.meta.url
// ).toString();

pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;

function App() {
  return (
    <Suspense
      fallback={
        <div className="w-100 min-vh-100 d-flex align-items-center justify-content-center">
          Loading
        </div>
      }
    >
      <PrimeReactProvider value={{ ripple: true }}>
        <Provider store={store}>
          <BrowserRouter
            future={{
              v7_relativeSplatPath: true,
              v7_startTransition: true,
            }}
          >
            <Routes>
              <Route path="/" element={<ToastWrapper></ToastWrapper>}>
                <Route
                  path="/login"
                  element={
                    <ErrorBoundary>
                      <Login />
                    </ErrorBoundary>
                  }
                >
                  <Route index element={<LoginScreen></LoginScreen>} />
                  <Route
                    path="forgot-password"
                    element={<ForgotPassword></ForgotPassword>}
                  />
                </Route>

                {/* <Route path="/forgot-password" element={<ErrorBoundary><ForgotPassword /></ErrorBoundary>} /> */}
                <Route
                  path="/esign/*"
                  element={<EsignConfirmation></EsignConfirmation>}
                />

                <Route
                  element={
                    <ProtectedRoute>
                      {" "}
                      <Layout />{" "}
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Home />} />
                  <Route
                    path="CreateIndividualOwner"
                    element={<CreateIndividualOwner />}
                  />
                  <Route path="new-medallion">
                    <Route index element={<NewMedallion />} />
                    <Route path=":case-id" element={<CaseIdProtect />}>
                      <Route index element={<NewMedallion />} />
                    </Route>
                    <Route
                      path="doc-viewer/:id"
                      element={<NewMedDocLayout />}
                    />
                    <Route
                      path="*"
                      element={<Navigate to={"/new-medallion"} />}
                    />
                  </Route>
                  <Route path="manage-owner">
                    <Route index element={<ManageOwner />} />
                    {/* <Route path="doc-viewer/:id" element={<ManageMedallionDocLayout />} />
                    <Route path="view" element={<ViewMedallion />} /> */}
                    <Route path="view/:id" element={<ViewOwner />} />
                    <Route
                      path="doc-viewer/:id"
                      element={<ManageMedallionOwnerDocLayout />}
                    />
                  </Route>
                  <Route path="manage-medallion">
                    <Route
                      index
                      element={<Manage title="Manage Medallion" />}
                    />
                    <Route
                      path="doc-viewer/:id"
                      element={<ManageMedallionDocLayout />}
                    />
                    <Route path="view" element={<ViewMedallion />} />
                  </Route>
                  {/* <Route path="allocate">
                    <Route
                      index
                      element={<Manage title="Allocate Medallion" />}
                    />
                    <Route
                      path="attach-vehicle"
                      element={<AttachVechile />}
                    ></Route>
                  </Route> */}
                  <Route path="new-driver">
                    {/* <Route path=":caseid" element={<NewDrivers />} /> */}
                    <Route index element={<NewDrivers />}></Route>
                    <Route
                      path="case/:caseType/:caseId"
                      element={<CaseProtected></CaseProtected>}
                    ></Route>
                  </Route>
                  <Route path="manage-driver">
                    <Route index element={<MangeDrivers />}></Route>

                    <Route
                      path="doc-viewer/:id"
                      element={<ManageDriverDocLayout />}
                    />
                    <Route
                      path="case/:caseType/:caseId"
                      element={<CaseProtected type="driver"></CaseProtected>}
                    ></Route>
                    <Route
                      path="lease-terminate"
                      element={<LeaseTerminate />}
                    />
                    <Route path="view/:id" element={<ViewDriverDetails />} />
                  </Route>
                  {/* <Route path="new-vehicle" element={<NewVehicle />}>
                    <Route path=":caseid" element={<NewVehicle />}></Route>
                  </Route> */}
                  <Route path="manage-vehicle">
                    <Route index element={<ManageVehicle />}></Route>
                    <Route
                      path="doc-viewer/:id"
                      element={<ManageVehicleDocLayout />}
                    />
                    <Route
                      path="view-inspection/:id"
                      element={<ViewInspection />}
                    />
                    <Route
                      path="view-inspection/:id/:individual-id"
                      element={<ViewInspectionDetail />}
                    />
                    <Route
                      path="case/:caseType/:caseId"
                      element={<CaseProtected></CaseProtected>}
                    ></Route>
                    <Route
                      path="VehicleRepairDetail"
                      element={<VehicleRepairDetail />}
                    ></Route>
                    <Route
                      path="view/:id"
                      element={<ViewVehicleDetails />}
                    ></Route>
                  </Route>
                  <Route path="manage-vehicle-owner">
                    <Route index element={<ManageVehicleOwner />}></Route>
                    <Route
                      path="case/:caseType/:caseId"
                      element={<CaseProtected></CaseProtected>}
                    ></Route>
                    <Route
                      path="view/:id"
                      element={<ViewVehicleOwnerDetails />}
                    />
                  </Route>
                  <Route path="manage-vehicle-ledger">
                    <Route index element={<ManageVehicleLedger />}></Route>
                  </Route>
                  <Route
                    path="new-lease"
                    element={<NewLease title="Create Lease" />}
                  >
                    <Route
                      path=":caseid"
                      element={<NewLease title="Create Lease" />}
                    ></Route>
                  </Route>
                  <Route
                    path="audit-trail"
                    element={<ManageAuditTrail />}
                  ></Route>
                  <Route path="manage-lease">
                    <Route index element={<ManageLease />}></Route>
                    <Route
                      path="case/:caseType/:caseId"
                      element={<CaseProtected></CaseProtected>}
                    ></Route>
                    <Route
                      path="doc-viewer/:id/:driver_id"
                      element={<ManageLeaseDocLayout />}
                    ></Route>
                    {/* <Route path="case/:caseType/:caseid" element={<NewLease title="Renew Lease" />}></Route> */}
                    <Route path="view" element={<ViewLeaseDetails />} />
                  </Route>
                  <Route
                    path="case/:caseType/:caseId"
                    element={<CaseProtected></CaseProtected>}
                  ></Route>

                  <Route path="/create-driver-payments">
                    <Route
                      path=":caseType"
                      element={<CaseCreateModal />}
                    ></Route>
                    <Route
                      path="case/:caseType/:caseId"
                      element={<CaseProtected></CaseProtected>}
                    ></Route>
                  </Route>
                  <Route path="/ledger-entry">
                    <Route
                      path=":caseType"
                      element={<CaseCreateModal />}
                    ></Route>
                    <Route
                      path="case/:caseType/:caseId"
                      element={<CaseProtected></CaseProtected>}
                    ></Route>
                  </Route>
                  <Route
                    path="search-driver"
                    element={<LedgerSearchDriver />}
                  ></Route>
                  <Route
                    path="LedgerEntryDetail"
                    element={<LedgerEntryDetail />}
                  ></Route>
                  <Route path="manage-ledger-entry">
                    <Route index element={<ManageLedgerEntry />}></Route>
                    <Route
                      path="edit/:driverId"
                      element={<EditLedgerEntry />}
                    ></Route>
                    <Route
                      path="view-ledger/:driverId"
                      element={<ViewLedger />}
                    ></Route>
                    <Route
                      path="view/:id"
                      element={<ViewLedgerDetails />}
                    ></Route>
                  </Route>

                  <Route path="/lease" element={<ComingSoon />}></Route>
                  <Route path="/trips" element={<ComingSoon />}></Route>
                  <Route path="/insurance" element={<ComingSoon />}></Route>
                  <Route path="/document" element={<ComingSoon />}></Route>
                  <Route path="/complaints" element={<ComingSoon />}></Route>
                  <Route path="/payments" element={<ComingSoon />}></Route>
                  {/* <Route path="allocate-vehicle" element={<ComingSoon />} /> */}

                  <Route path="view-trips" element={<ViewTrips />} />
                  <Route path="view-trips/:id" element={<IndividualTrip />} />
                  <Route path="curb-trips" element={<ViewCrub />} />
                  <Route path="ezpass-trips" element={<ManageEzpass />} />
                  <Route path="pvb-trips" element={<ManagePVB />} />
                  <Route
                    path="pvb-trips/case/:caseType/:caseId"
                    element={<CaseProtected></CaseProtected>}
                  ></Route>

                  <Route path="procure-insurance" element={<ComingSoon />} />
                  <Route path="claim-insurance" element={<ComingSoon />} />
                  <Route path="manage-insurance" element={<ComingSoon />} />
                  <Route path="manage-claims" element={<ComingSoon />} />

                  <Route path="new-complaints" element={<ComingSoon />} />
                  <Route path="manage-complaints" element={<ComingSoon />} />

                  <Route
                    path="CollectSearchDriver"
                    element={<CollectSearchDriver />}
                  />
                  <Route
                    path="EnterPaymentDriverDetails"
                    element={<EnterPaymentDriverDetails />}
                  />
                  <Route
                    path="ViewDriverSubmitReceipt"
                    element={<ViewDriverSubmitReceipt />}
                  />
                  <Route
                    path="EnterDriverRecipt"
                    element={<EnterDriverRecipt />}
                  />
                  <Route path="ChoosePayPeriod" element={<ChoosePayPeriod />} />
                  <Route
                    path="/manage-driver-payments"
                    element={<ManageDriverPayments />}
                  >
                    <Route path="audit-trail" element={<ManageAuditTrail />} />
                  </Route>
                  <Route path="collect-from-driver" element={<ComingSoon />} />
                  <Route path="miscellaneous">
                    <Route index element={<Miscellaneous />} />
                    <Route
                      path="manage-correspondence"
                      element={<MangeCorrespondence />}
                    />
                    <Route
                      path="create-correspondence/:id"
                      element={<Createcorrespondence />}
                    />
                    <Route path="notification" element={<Notification />} />
                    <Route path="lease-config" element={<LeaseConfig />} />
                    <Route
                      path="manage-user-role"
                      element={<ManageUserRole />}
                    />
                    <Route
                      path="manage-user-role/:user-id"
                      element={<PersonalInfo />}
                    />
                    <Route path="manage-ezpass" element={<ManageEzpass />} />
                    <Route
                      path="manage-ezpass/:id"
                      element={<ViewEzpassDetail />}
                    />
                    <Route path="view-ezpass" element={<ViewEzpassLog />} />
                    <Route path="manage-pvb" element={<ManagePVB />} />
                    <Route path="manage-pvb/:id" element={<ViewPvbDetail />} />
                    <Route path="view-pvb" element={<ViewPvbLog />} />
                  </Route>

                  <Route path="reports" element={<AiChat />} />
                  <Route path="coming-soon" element={<ComingSoon />} />

                  <Route path="*" element={<NotFound />}></Route>
                </Route>
                <Route
                  path="case/:caseType/:caseId"
                  element={<CaseProtected></CaseProtected>}
                ></Route>
                <Route path="*" element={<NotFound />}></Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </Provider>
      </PrimeReactProvider>
    </Suspense>
  );
}

export default App;
