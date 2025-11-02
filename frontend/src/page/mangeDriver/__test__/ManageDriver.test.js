import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import { legacy_configureStore as configureStore } from 'redux-mock-store';
import ManageDriver from '../index';
import { useDriverLockStatusMutation, useLazyExportDriversQuery, useLazyGetDriverQuery, useSearchDriverMutation } from '../../../redux/api/driverApi';
import { useGetManageAuditTrailQuery } from '../../../redux/api/auditTrailAPI';

jest.mock('../../../redux/api/driverApi', () => ({
    useLazyGetDriverQuery: jest.fn(),
    useDriverLockStatusMutation: jest.fn(),
    useLazyExportDriversQuery: jest.fn(),
    useSearchDriverMutation: jest.fn(),
    useGetManageAuditTrailQuery: jest.fn(),
}));

jest.mock('../../../redux/api/auditTrailAPI', () => ({
    useGetManageAuditTrailQuery: jest.fn(),
}));

const mockStore = configureStore([]);

describe('ManageDriver Component', () => {
    let store;
    const driverData = [
            {
                "driver_details": {
                    "driver_id": 1,
                    "driver_lookup_id": 466952,
                    "first_name": "Robert",
                    "middle_name": null,
                    "last_name": "Castillo",
                    "driver_type": "Regular",
                    "driver_status": "Active",
                    "driver_ssn": "XXX-XX-5032",
                    "marital_status": "Divorced",
                    "dob": "1986-05-09 00:00:00",
                    "gender": null,
                    "phone_number_1": "379-402-5644",
                    "phone_number_2": "196-622-6495",
                    "email_address": "robert.castillo@example.com",
                    "primary_emergency_contact_person": null,
                    "primary_emergency_contact_relationship": null,
                    "primary_emergency_contact_number": null,
                    "additional_emergency_contact_person": null,
                    "additional_emergency_contact_relationship": null,
                    "additional_emergency_contact_number": null,
                    "violation_due_at_registration": null,
                    "is_drive_locked": false,
                    "has_audit_trail": true
                },
                "dmv_license_details": {
                    "is_dmv_license_active": true,
                    "dmv_license_number": "DMV79678",
                    "dmv_license_issued_state": "NY",
                    "dmv_license_expiry_date": "2026-07-17T00:00:00"
                },
                "tlc_license_details": {
                    "is_tlc_license_active": true,
                    "tlc_license_number": "TLC46278",
                    "tlc_license_expiry_date": "2027-05-18T00:00:00"
                },
                "primary_address_details": {
                    "address_line_1": "745 Main St",
                    "address_line_2": null,
                    "city": null,
                    "state": null,
                    "zip": null,
                    "latitude": null,
                    "longitude": null
                },
                "secondary_address_details": {
                    "latitude": null,
                    "longitude": null
                },
                "payee_details": {
                    "pay_to_mode": null,
                    "bank_name": null,
                    "bank_account_number": null,
                    "address_line_1": "",
                    "address_line_2": "",
                    "city": "",
                    "state": "",
                    "zip": "",
                    "pay_to": null
                },
                "lease_info": {
                    "has_active_lease": false,
                    "lease_type": "short-term"
                },
                "has_documents": false,
                "has_vehicle": false,
                "is_archived": false
            },
        ];
    const renderWithProviders = (ui) => {
        return render(
            <Provider store={store}>
                <Router future={{
                    v7_relativeSplatPath: true,
                    v7_startTransition: true,
                }}>
                    {ui}
                </Router>
            </Provider>
        );
    };

    beforeEach(() => {
        store = mockStore({
            medallion: {
                selectedMedallionDetail: {},
            },
        });

        useLazyGetDriverQuery.mockReturnValue([jest.fn(), { data: { items: [], total_items: 0 } }]);
        useDriverLockStatusMutation.mockReturnValue([jest.fn(), { data: { items: [], total_items: 0 } }]);
        useLazyExportDriversQuery.mockReturnValue([jest.fn(), { data: { items: [], total_items: 0 } }]);
        useSearchDriverMutation.mockReturnValue([jest.fn(), { data: { items: [], total_items: 0 } }]);
        // useGetManageAuditTrailQuery.mockReturnValue({ data: { items: [], total_items: 0 } });
        useGetManageAuditTrailQuery.mockReturnValue({ data: {"results":[],"total":0,"match_all":true} })
    });

    afterEach(() => {
        jest.clearAllMocks();
      });

    it('Should Manage Drivers text render successfully', () => {
        renderWithProviders(<ManageDriver />);
        expect(screen.getByText('Manage Drivers')).toBeInTheDocument();
        expect(screen.getByText('No records found')).toBeInTheDocument();
    });

    it('Should Driver table List is empty', () => {
        renderWithProviders(<ManageDriver />);
        const totalItemCount = screen.getByTestId("total_item_count");
        expect(totalItemCount).toBeInTheDocument();
        expect(totalItemCount).toHaveTextContent(/0/i);
        expect(screen.getByText('No records found')).toBeInTheDocument();
        expect(screen.queryByTestId("paginator")).not.toBeInTheDocument();
    });

    it('Should displays driver information successfully',()=>{
        useLazyGetDriverQuery.mockReturnValue([jest.fn(),
            { data: { items: driverData, total_items: driverData.length } }]);
        useGetManageAuditTrailQuery.mockReturnValue({ data: {"results":[],"total":0,"match_all":true} })
        renderWithProviders(<ManageDriver />);
        const gridDriverId=screen.getByTestId("grid-driver-id")
        const gridDriverName=screen.getByTestId("grid-driver-first-name")
        const gridDriverStatus=screen.getByTestId("grid-driver-status")
        const gridDriverType=screen.getByTestId("grid-driver-type")
        const gridLeaseType=screen.getByTestId("grid-lease-type")
        const gridTLCNum=screen.getByTestId("grid-tlc-num")
        const gridDMVNum=screen.getByTestId("grid-dmv-num")
        expect(gridDriverId).toHaveTextContent('466952');
        expect(gridDriverName).toHaveTextContent('Robert');
        expect(gridDriverStatus).toHaveTextContent('Active');
        expect(gridDriverType).toHaveTextContent('Regular');
        expect(gridLeaseType).toHaveTextContent('short-term');
        expect(gridTLCNum).toHaveTextContent('TLC46278');
        expect(gridDMVNum).toHaveTextContent('DMV79678');
        // expect(screen.getByTestId('un-lock-btn')).toBeInTheDocument();
        // expect(screen.queryByTestId('lock-btn')).toBeNull();
    })

    it('Should Showing List count render successfully', () => {
        useLazyGetDriverQuery.mockReturnValue([jest.fn(),
        { data: { items: driverData, total_items: driverData.length } }]);
        renderWithProviders(<ManageDriver />);
        const totalItemCount = screen.getByTestId("total_item_count");
        expect(totalItemCount).toHaveTextContent(/1/i);
        const paginator = screen.queryByTestId("paginator");
        expect(paginator).toBeInTheDocument();
    });

    it('Should refetch data when refetch button is clicked', async () => {
        renderWithProviders(<ManageDriver />);
        const refetchButton = screen.getByTestId("refresh_btn");
        refetchButton.click();
        await waitFor(() => expect(useLazyGetDriverQuery).toHaveBeenCalledTimes(1));
        const totalItemCount = screen.getByTestId("total_item_count");
        expect(totalItemCount).toHaveTextContent(/0/i);
    });

    it('should handle page changes and trigger API calls', async () => {
        useLazyGetDriverQuery.mockReturnValue([jest.fn(),
        { data: { items: driverData, total_items: driverData.length } }]);
        renderWithProviders(<ManageDriver />);

        const nextPageButton = await screen.findByLabelText('Next Page');

        expect(nextPageButton).toBeInTheDocument();
        fireEvent.click(nextPageButton);
        await waitFor(() => expect(useLazyGetDriverQuery).toHaveBeenCalledTimes(1));
    });

    it('should show the drop down when an action is clicked', async () => {
        useLazyGetDriverQuery.mockReturnValue([jest.fn(),
        { data: { items: driverData, total_items: driverData.length } }]);

        renderWithProviders(<ManageDriver />);

        const openModalButton = screen.getByTestId('three-dot-menu')

        fireEvent.click(openModalButton);
        expect(screen.getByText(/Update Address/)).toBeInTheDocument();
   
    });

    it('should show the Confirmation modal when an action is clicked', async () => {
        useLazyGetDriverQuery.mockReturnValue([jest.fn(),
        { data: { items: driverData, total_items: driverData.length } }]);

        renderWithProviders(<ManageDriver />);

        const openModalButton = screen.getByTestId('three-dot-menu')

        fireEvent.click(openModalButton);
        const updateAddressBtn=screen.getByText(/Update Address/)
        expect(updateAddressBtn).toBeInTheDocument();
        fireEvent.click(updateAddressBtn);
        const confirmationModal=screen.getByText(/Confirmation on Driver Address Update/)
        expect(confirmationModal).toBeInTheDocument();
        // test.failing('it is not equal', () => {
        //     expect(5).toBe(6); // this test will pass
        //   });
          
        //   test.failing('it is equal', () => {
        //     expect(10).toBe(10); // this test will fail
        //   });
    }); 
});
