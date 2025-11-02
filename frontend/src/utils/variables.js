export const statesOptions = [
  { name: "Alabama", code: "Alabama" },
  { name: "Alaska", code: "Alaska" },
  { name: "Arizona", code: "Arizona" },
  { name: "Arkansas", code: "Arkansas" },
  { name: "California", code: "California" },
  { name: "Colorado", code: "Colorado" },
  { name: "Connecticut", code: "Connecticut" },
  { name: "Delaware", code: "Delaware" },
  { name: "District of Columbia", code: "District of Columbia" },
  { name: "Florida", code: "Florida" },
  { name: "Georgia", code: "Georgia" },
  { name: "Hawaii", code: "Hawaii" },
  { name: "Idaho", code: "Idaho" },
  { name: "Illinois", code: "Illinois" },
  { name: "Indiana", code: "Indiana" },
  { name: "Iowa", code: "Iowa" },
  { name: "Kansas", code: "Kansas" },
  { name: "Kentucky", code: "Kentucky" },
  { name: "Louisiana", code: "Louisiana" },
  { name: "Maine", code: "Maine" },
  { name: "Maryland", code: "Maryland" },
  { name: "Massachusetts", code: "Massachusetts" },
  { name: "Michigan", code: "Michigan" },
  { name: "Minnesota", code: "Minnesota" },
  { name: "Mississippi", code: "Mississippi" },
  { name: "Missouri", code: "Missouri" },
  { name: "Montana", code: "Montana" },
  { name: "Nebraska", code: "Nebraska" },
  { name: "Nevada", code: "Nevada" },
  { name: "New Hampshire", code: "New Hampshire" },
  { name: "New Jersey", code: "New Jersey" },
  { name: "New Mexico", code: "New Mexico" },
  { name: "New York", code: "New York" },
  { name: "North Carolina", code: "North Carolina" },
  { name: "North Dakota", code: "North Dakota" },
  { name: "Ohio", code: "Ohio" },
  { name: "Oklahoma", code: "Oklahoma" },
  { name: "Oregon", code: "Oregon" },
  { name: "Pennsylvania", code: "Pennsylvania" },
  { name: "Rhode Island", code: "Rhode Island" },
  { name: "South Carolina", code: "South Carolina" },
  { name: "South Dakota", code: "South Dakota" },
  { name: "Tennessee", code: "Tennessee" },
  { name: "Texas", code: "Texas" },
  { name: "Utah", code: "Utah" },
  { name: "Vermont", code: "Vermont" },
  { name: "Virginia", code: "Virginia" },
  { name: "Washington", code: "Washington" },
  { name: "West Virginia", code: "West Virginia" },
  { name: "Wisconsin", code: "Wisconsin" },
  { name: "Wyoming", code: "Wyoming" },
];
export const relationshipOptions = [
  { name: "Father", code: "FATHER" },
  { name: "Mother", code: "MOTHER" },
  { name: "Spouse", code: "SPOUSE" },
  { name: "Son", code: "SON" },
  { name: "Daughter", code: "DAUGHTER" },
  { name: "Brother", code: "BROTHER" },
  { name: "Sister", code: "SISTER" },
  { name: "Guardian", code: "GUARDIAN" },
  { name: "Friend", code: "FRIEND" },
  { name: "Other", code: "OTHER" },
];
export const createIndividualOwner = {
  field_01: {
    id: "firstName",
    label: "First Name",
    isRequire: true,
  },
  field_02: {
    id: "middleName",
    label: "Middle Name",
  },
  field_03: {
    id: "lastName",
    label: "Last Name",
    isRequire: true,
  },
  field_04: {
    id: "ssn",
    label: "SSN",
    isRequire: true,
  },
  field_05: {
    id: "dob",
    label: "D.O.B",
    // isRequire: true
  },
  field_06: {
    id: "selectDocument",
    label: "Select Document",
    options: [
      { name: "Driving License", code: "drivingLicense" },
      { name: "Passport", code: "passport" },
    ],
    isRequire: true,
  },
  field_07: {
    id: "drivingLicenseNo",
    label: "Driving License Number",
    isRequire: true,
  },
  field_08: {
    id: "drivingLicenseExpiryDate",
    label: "Driving License Expiry Date",
    isRequire: true,
  },
  field_09: {
    id: "passportNo",
    label: "Passport Number",
    // isRequire: true,
  },
  field_10: {
    id: "passport_expiry_date",
    label: "Passport Expiry Date",
    isRequire: true,
  },
  field_11: {
    id: "primaryAddress1",
    label: "Address Line 1",
    isRequire: true,
  },
  field_12: {
    id: "primaryAddress2",
    label: "Address Line 2",
  },
  field_13: {
    id: "primaryCity",
    label: "City",
    isRequire: true,
  },
  field_14: {
    id: "primaryState",
    label: "State",
    isRequire: true,
    options: statesOptions,
  },
  field_15: {
    id: "primaryZip",
    label: "ZIP",
    isRequire: true,
  },
  field_16: {
    id: "primaryLatitude",
    label: "Latitude",
  },
  field_17: {
    id: "primaryLongitude",
    label: "Longitude",
  },
  field_18: {
    id: "secondaryAddress1",
    label: "Address Line 1",
    isRequire: true,
  },
  field_19: {
    id: "secondaryAddress2",
    label: "Address Line 2",
  },
  field_20: {
    id: "secondaryCity",
    label: "City",
    isRequire: true,
  },
  field_21: {
    id: "secondaryState",
    label: "State",
    isRequire: true,
    options: statesOptions,
  },
  field_22: {
    id: "secondaryZip",
    label: "ZIP",
    isRequire: true,
  },
  field_23: {
    id: "secondaryLatitude",
    label: "Latitude",
  },
  field_24: {
    id: "secondaryLongitude",
    label: "Longitude",
  },
  field_25: {
    id: "payTo",
    label: "Pay To",
    inputType: "RADIO",
    size: "xl",
    options: [
      { value: "Check", label: "Check" },
      { value: "ACH", label: "ACH" },
    ],
  },
  field_26: {
    id: "bank_routing_number",
    label: "Routing Number",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  field_27: {
    id: "bankName",
    label: "Bank Name",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  field_28: {
    id: "bankAccountNumber",
    label: "Bank Account Number",
    useGrouping: false,
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  field_29: {
    id: "confirmBankAccountNumber",
    label: "Confirm Bank Account Number",
    useGrouping: false,
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  field_30: {
    id: "payee",
    label: "Payee",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  field_31: {
    id: "bankAccountName",
    label: "Bank Account Name",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  field_32: {
    id: "addressLine1",
    label: "Address Line 1",
    inputType: "INPUT",
    size: "lg",
  },
  field_33: {
    id: "addressLine2",
    label: "Address Line 2",
    inputType: "INPUT",
    size: "lg",
  },
  field_34: {
    id: "city",
    label: "City",
    inputType: "INPUT",
    size: "sm",
  },
  field_35: {
    id: "state",
    label: "State",
    inputType: "SELECT",
    size: "sm",
    options: statesOptions,
  },
  field_36: {
    id: "zip",
    label: "Zip",
    inputType: "INPUT",
    size: "sm",
  },
  // field_37: {
  //   id: "effectiveFrom",
  //   label: "Effective From",
  //   inputType: "CALENDAR",
  //   size: "md",
  // },
  field_38: {
    id: "checkPayee",
    label: "Payee",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  field_39: {
    id: "primaryContactNumber",
    label: "Primary Contact Number",
    isRequire: true,
  },
  field_40: {
    id: "additionalPhone1",
    label: "Additional Phone Number",
  },
  field_41: {
    id: "additionalPhone2",
    label: "Additional Phone Number 2",
  },
  field_42: {
    id: "primaryEmailAddress",
    label: "Email Address",
    isRequire: true,
  },
};

export const medallionDetail = {
  field_01: {
    id: "medallionNumber",
    label: "Medallion Number",
  },
  field_02: {
    id: "medallionType",
    label: "Medallion Type",
    options: [
      // { name: "Hybrid", code: "Hybrid" },
      { name: "Regular", code: "Regular" },
      { name: "WAV", code: "Wav" },
    ],
  },
  field_03: {
    id: "lastRenewalDate",
    label: "Last Renewal Date",
  },
  field_04: {
    id: "validFromDate",
    label: "Valid From",
  },
  field_05: {
    id: "validToDate",
    label: "Expiration Date",
    minDate: new Date(),
  },
  field_06: {
    id: "renewalReceiptPath",
    label: "Renewal Receipt",
  },
  field_07: {
    id: "isStorage",
    label: "Storage",
    options: [
      { label: "Yes", value: true, id: "yesId" },
      { label: "No", value: false, id: "noId" },
    ],
  },
  field_08: {
    id: "fs6Status",
    label: "FS6 Receipt",
  },
  field_09: {
    id: "fs6Date",
    label: "FS6 Update Date",
  },
  field_10: {
    id: "first_signed",
    label: "First Signed Date",
  },
  field_11: {
    id: "agentName",
    label: "Agent Name",
    value: "Big Apple Taxi Management LLC",
  },
  field_12: {
    id: "agentNumber",
    label: "Agent Number",
    value: 358,
  },
  field_13: {
    id: "amount",
    label: "Amount",
  },
  medallion_storage_receipt: {
    id: "medallion_storage_receipt",
    label: "Medallion Storage Receipt",
  },
};

export const updateMedallionDetail = {
  field_02: {
    id: "medallionType",
    label: "Medallion Type",
    options: [
      { name: "WAV", code: "Wav" },
      { name: "Regular", code: "Regular" },
      // { name: "Hybrid", code: "Hybrid" },
    ],
  },
  field_06: {
    id: "renewalReceiptPath",
    label: "Renewal Receipt",
  },
  field_07: {
    id: "isStorage",
    label: "Storage",
    options: [
      { label: "Yes", value: true, id: "yesId" },
      { label: "No", value: false, id: "noId" },
    ],
  },
  field_10: {
    id: "first_signed",
    label: "First Signed Date",
  },
};

export const leaseDetail = {
  // field_01: {
  //     id: "merchant_name",
  //     label: "Merchant Name"
  // },
  // field_02: {
  //     id: "merchant_bank",
  //     label: "Merchant Bank",
  // },
  contract_term: {
    id: "contract_term",
    label: "Contract Term",
    options: [
      { name: "1 Year", code: "1 Year" },
      { name: "2 Years", code: "2 Years" },
      { name: "3 Years", code: "3 Years" },
    ],
  },
  contract_effective_date: {
    id: "contract_effective_date",
    label: "Contract Effective Date",
    minDate: new Date(),
  },
  royalty_payment_amount: {
    id: "royalty_payment_amount",
    label: "Royalty payment amount",
    keyfilter: "pnum",
    min: 0,
  },

  field_03: {
    id: "contract_start_date",
    label: "Contract Start Date",
  },
  field_04: {
    id: "contract_end_date",
    label: "Contract End Date",
  },
  field_05: {
    id: "contract_signed_mode",
    label: "Contract Signature Method",
    options: [
      // { name: "In Person", code: "I" },
      // { name: "Email", code: "M" },
      { name: "Print", code: "P" },
    ],
  },
  field_06: {
    id: "mail_sent_date",
    label: "Mail Sent Date",
  },
  field_07: {
    id: "mail_received_date",
    label: "Mail Received Date",
  },
  field_08: {
    id: "in_house_lease",
    label: "In-House",
    options: [
      { label: "Yes", value: "Y", id: "inHouseYes" },
      { label: "No", value: "N", id: "inHouseNo" },
    ],
  },
  field_09: {
    id: "lease_signed_flag",
    label: "Lease Signed",
    options: [
      { label: "Yes", value: true, id: "leaseSignedYes" },
      { label: "No", value: false, id: "leaseSignedNo" },
    ],
  },
  field_10: {
    id: "lease_signed_date",
    label: "Lease Signed Date",
  },
  field_11: {
    id: "med_active_exemption",
    label: "Medallion Active Exemption",
    options: [
      { label: "Yes", value: "Y", id: "medallionActiveExemptionYes" },
      { label: "No", value: "N", id: "medallionActiveExemptionNo" },
    ],
  },
};

export const chooseMedallionOwner = {
  field_01: {
    id: "medallionOwnerName",
    label: "Medallion Owner Name",
  },
  field_02: {
    id: "SSN",
    label: "SSN",
  },
  field_03: {
    id: "EIN",
    label: "EIN",
  },
};

export const chooseEntity = {
  field_01: {
    id: "entityName",
    label: "Entity Name",
  },
  field_02: {
    id: "EIN",
    label: "EIN",
  },
};

export const chooseLease = {
  field_01: {
    id: "medallionNo",
    label: "Medallion No",
  },
  field_02: {
    id: "vinNo",
    label: "VIN No",
  },
  field_03: {
    id: "plateNo",
    label: "Plate No",
  },
  field_04: {
    id: "shift_availability",
    label: "Shift Availability",
    options: [
      { name: "Day Shift", code: "day" },
      { name: "Night Shift", code: "night" },
      { name: "Full", code: "full" },
    ],
  },
};

export const chooseDriverLease = {
  field_01: {
    id: "TLCLicenseNo",
    label: "TLC License No",
  },
  field_02: {
    id: "DMVLicenseNo",
    label: "DMV License No",
  },
  field_03: {
    id: "SSN",
    label: "SSN",
  },
};
export const createEntity = {
  field_01: {
    id: "Corporation Name",
    label: "Corporation Name",
  },
  field_02: {
    id: "registeredDate",
    label: "Registered Date",
  },
  field_03: {
    id: "corporationEIN",
    label: "Corporation EIN",
  },
  field_04: {
    id: "addressLine1",
    label: "Address Line 1",
  },
  field_05: {
    id: "addressLine2",
    label: "Address Line 2",
  },
  field_06: {
    id: "city",
    label: "City",
  },
  field_07: {
    id: "state",
    label: "State",
  },
  field_08: {
    id: "zip",
    label: "ZIP",
  },
  field_09: {
    id: "contactfirstName",
    label: "First Name",
  },
  field_10: {
    id: "contactMiddleName",
    label: "Middle Name",
  },
  field_11: {
    id: "contactLastName",
    label: "Last Name",
  },
  field_12: {
    id: "contactSsn",
    label: "ssn",
  },
  field_13: {
    id: "contactD.O.B",
    label: "D.O.B",
  },
  field_14: {
    id: "contactPassportExpiryDate",
    label: "Passport Expiry Date",
  },
  field_15: {
    id: "contactaddressLine1",
    label: "Address Line 1",
  },
  field_16: {
    id: "contactaddressLine2",
    label: "Address Line 2",
  },
  field_17: {
    id: "contactcity",
    label: "City",
  },
  field_18: {
    id: "contactstate",
    label: "State",
  },
  field_19: {
    id: "contactzip",
    label: "ZIP",
  },
  field_20: {
    id: "contactNumber",
    label: "Contact Number",
  },
  field_21: {
    id: "emailAddress",
    label: "Email Address",
  },
  field_22: {
    id: "payto",
    label: "Pay To",
    options: [
      { label: "Check", value: "Check", id: "checkId" },
      { label: "ACH", value: "ACH", id: "achId" },
    ],
  },
  field_23: {
    id: "bankName",
    label: "Bank Name",
  },
  field_24: {
    id: "bankAccountNumber",
    label: "Bank Account Number",
  },
  field_25: {
    id: "payee",
    label: "Payee",
  },
  field_26: {
    id: "bankaddressLine1",
    label: "Address Line 1",
  },
  field_27: {
    id: "bankaddressLine2",
    label: "Address Line 2",
  },
  field_28: {
    id: "bankcity",
    label: "City",
  },
  field_29: {
    id: "bankstate",
    label: "State",
  },
  field_30: {
    id: "bankzip",
    label: "ZIP",
  },
  field_31: {
    id: "effectiveFrom",
    label: "Effective From",
  },
  field_32: {
    id: "president",
    label: "President",
    options: [
      { name: "New York", code: "NY" },
      { name: "Rome", code: "RM" },
      { name: "London", code: "LDN" },
      { name: "Istanbul", code: "IST" },
      { name: "Paris", code: "PRS" },
    ],
  },
  field_33: {
    id: "Secretary",
    label: "Secretary",
    options: [
      { name: "New York", code: "NY" },
      { name: "Rome", code: "RM" },
      { name: "London", code: "LDN" },
      { name: "Istanbul", code: "IST" },
      { name: "Paris", code: "PRS" },
    ],
  },
  field_34: {
    id: "corporateOfficers",
    label: "Corporate Officers",
    options: [
      { name: "New York", code: "NY" },
      { name: "Rome", code: "RM" },
      { name: "London", code: "LDN" },
      { name: "Istanbul", code: "IST" },
      { name: "Paris", code: "PRS" },
    ],
  },
  field_35: {
    id: "provider",
    label: "Provider",
    options: [
      { name: "New York", code: "NY" },
      { name: "Rome", code: "RM" },
      { name: "London", code: "LDN" },
      { name: "Istanbul", code: "IST" },
      { name: "Paris", code: "PRS" },
    ],
  },
  field_36: {
    id: "broker",
    label: "Broker",
    options: [
      { name: "New York", code: "NY" },
      { name: "Rome", code: "RM" },
      { name: "London", code: "LDN" },
      { name: "Istanbul", code: "IST" },
      { name: "Paris", code: "PRS" },
    ],
  },
  field_37: {
    id: "policy",
    label: "Policy",
  },
  field_38: {
    id: "amount",
    label: "Amount",
  },
  field_39: {
    id: "begins",
    label: "Begins",
  },
  field_40: {
    id: "ends",
    label: "Ends",
  },
  field_41: {
    id: "ledgerID",
    label: "Ledger ID",
    options: [
      { name: "New York", code: "NY" },
      { name: "Rome", code: "RM" },
      { name: "London", code: "LDN" },
      { name: "Istanbul", code: "IST" },
      { name: "Paris", code: "PRS" },
    ],
  },
  field_42: {
    id: "contractstartDate",
    label: "Contract Start Date",
  },
  field_43: {
    id: "contractEndDate",
    label: "Contract End Date",
  },
  field_44: {
    id: "firstSignedDate",
    label: "First Signed Date",
  },
};

export const createCorporation = {
  field_01: {
    id: "nameCorporation",
    label: "Name of the Corporation",
  },
  field_02: {
    id: "EIN",
    label: "EIN",
  },
  field_03: {
    id: "primaryTelephoneNumber",
    label: "Primary Telephone Number",
  },
  field_04: {
    id: "addressLine1",
    label: "Address Line 1",
  },
  field_05: {
    id: "addressLine2",
    label: "Address Line 2",
  },
  field_06: {
    id: "city",
    label: "City",
  },
  field_07: {
    id: "state",
    label: "State",
    options: statesOptions,
  },
  field_08: {
    id: "zip",
    label: "ZIP",
  },
  field_11: {
    id: "secondaryTelephoneNumber",
    label: "Secondary Telephone Number",
  },
  field_12: {
    id: "emailAddress",
    label: "Email Address",
  },
  field_13: {
    id: "accountID",
    label: "Account ID",
  },
  field_14: {
    id: "cpfirstName",
    label: "First Name",
  },
  field_15: {
    id: "cpMiddleName",
    label: "Middle Name",
  },
  field_16: {
    id: "cpLastName",
    label: "Last Name",
  },
  field_17: {
    id: "contactSsn",
    label: "SSN",
  },
  field_18: {
    id: "contactDOB",
    label: "D.O.B",
    maxDate: new Date(),
  },
  field_19: {
    id: "selectDocument",
    label: "Select Document",
    options: [
      { name: "Driving License", code: "drivingLicense" },
      { name: "Passport", code: "passport" },
    ],
  },
  field_20: {
    id: "drivingLicenseNo",
    label: "Driving License No",
  },
  field_21: {
    id: "drivingLicenseExpiryDate",
    label: "Driving License Expiry Date",
  },
  passportNo: {
    id: "passportNo",
    label: "Passport No",
  },
  passportExpiryDate: {
    id: "passportExpiryDate",
    label: "Passport Expiry Date",
  },
  field_22: {
    id: "member",
    label: "Member",
    options: [
      { name: "New York", code: "NY" },
      { name: "Rome", code: "RM" },
      { name: "London", code: "LDN" },
      { name: "Istanbul", code: "IST" },
      { name: "Paris", code: "PRS" },
    ],
  },
  field_23: {
    id: "president",
    label: "President",
    options: [
      { name: "New York", code: "NY" },
      { name: "Rome", code: "RM" },
      { name: "London", code: "LDN" },
      { name: "Istanbul", code: "IST" },
      { name: "Paris", code: "PRS" },
    ],
  },
  field_24: {
    id: "payTo",
    label: "Pay To",
    inputType: "RADIO",
    size: "xl",
    options: [
      { value: "Check", label: "Check" },
      { value: "ACH", label: "ACH" },
    ],
  },
  field_25: {
    id: "bank_routing_number",
    label: "Route Number",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  field_26: {
    id: "bankName",
    label: "Bank Name",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  field_27: {
    id: "bankAccountNumber",
    label: "Bank Account Number",
    useGrouping: false,
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  field_28: {
    id: "confirmBankAccountNumber",
    label: "Confirm Bank Account Number",
    useGrouping: false,
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  field_29: {
    id: "payee",
    label: "Payee",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  field_30: {
    id: "bankAccountName",
    label: "Bank Account Name",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  field_31: {
    id: "payAddressLine1",
    label: "Address Line 1",
    inputType: "INPUT",
    size: "lg",
  },
  field_32: {
    id: "payAddressLine2",
    label: "Address Line 2",
    inputType: "INPUT",
    size: "lg",
  },
  field_33: {
    id: "payeeCity",
    label: "City",
    inputType: "INPUT",
    size: "sm",
  },
  field_34: {
    id: "payeeState",
    label: "State",
    inputType: "INPUT",
    size: "sm",
  },
  field_35: {
    id: "payeeZip",
    label: "ZIP",
    inputType: "INPUT",
    size: "sm",
  },
  // field_36: {
  //   id: "effectiveFrom",
  //   label: "Effective From",
  //   inputType: "CALENDAR",
  //   size: "md",
  // },
  field_37: {
    id: "checkPayee",
    label: "Payee",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  field_38: {
    id: "corporateOfficers",
    label: "Corporate Officers",
    options: [
      { name: "New York", code: "NY" },
      { name: "Rome", code: "RM" },
      { name: "London", code: "LDN" },
      { name: "Istanbul", code: "IST" },
      { name: "Paris", code: "PRS" },
    ],
  },
  // contract_signed_mode: {
  //   id: "contract_signed_mode",
  //   label: "Contract Signature Method",
  //   options: [
  //     { name: "In Person", code: "I" },
  //     { name: "Email", code: "M" },
  //     { name: "Print", code: "P" },
  //   ],
  // },
  field_39: {
    id: "primaryEmailAddress",
    label: "Email Address",
    isRequire: true,
  },

  field_40: {
    id: "primaryContactNumber",
    label: "Contact Number",
    isRequire: true,
  },

  field_41: {
    id: "additionalPhone1",
    label: "Additional Phone Number",
  },
  field_42: {
    id: "key_people",
    label: "Key People",
    options: [
      { name: "President", code: "president" },
      { name: "Secretary", code: "secretary" },
      { name: "Corporate Officer", code: "corporate officer" },
    ],
  },

  field_43: {
    id: "keyPeoplefirstName",
    label: "First Name",
    isRequire: true,
  },
  field_44: {
    id: "keyPeopleMiddleName",
    label: "Middle Name",
  },
  field_45: {
    id: "keyPeopleLastName",
    label: "Last Name",
  },

  field_46: {
    id: "keyPeopleAddressLine1",
    label: "Address Line 1",
  },
  field_47: {
    id: "keyPeopleAddressLine2",
    label: "Address Line 2",
  },

  primaryAddress1: {
    id: "primaryAddress1",
    label: "Address Line 1",
    isRequire: true,
  },
  primaryAddress2: {
    id: "primaryAddress2",
    label: "Address Line 2",
  },
  primaryCity: {
    id: "primaryCity",
    label: "City",
    isRequire: true,
  },
  primaryState: {
    id: "primaryState",
    label: "State",
    isRequire: true,
    options: statesOptions,
  },
  primaryZip: {
    id: "primaryZip",
    label: "ZIP",
    isRequire: true,
  },
  primaryContactNumber1: {
    id: "primaryContactNumber1",
    label: "Contact Number",
    isRequire: true,
  },
  additionalPhoneNumber1: {
    id: "additionalPhoneNumber1",
    label: "Additional Phone Number",
  },
  primaryEmailAddress1: {
    id: "primaryEmailAddress1",
    label: "Email Address",
    isRequire: true,
  },

  secondaryAddress1: {
    id: "secondaryAddress1",
    label: "Address Line 1",
    isRequire: true,
  },
  secondaryAddress2: {
    id: "secondaryAddress2",
    label: "Address Line 2",
  },
  secondaryCity: {
    id: "secondaryCity",
    label: "City",
    isRequire: true,
  },
  secondaryState: {
    id: "secondaryState",
    label: "State",
    isRequire: true,
    options: statesOptions,
  },
  secondaryZip: {
    id: "secondaryZip",
    label: "ZIP",
    isRequire: true,
  },
  entity_type: {
    id: "entity_type",
    label: "Entity Type",
    options: [
      { name: "Corporation", code: false },
      { name: "LLC", code: true },
    ],
  },
  parent_holding_company: {
    id: "parent_holding_company",
    label: "Parent Holding Company",
    options: [
      { name: "None", code: "None" },
      { name: "APA TAXI HOLDINGS LLC", code: "APA TAXI HOLDINGS LLC" },
      {
        name: "BIG CITY TAXI HOLDINGS LLC",
        code: "BIG CITY TAXI HOLDINGS LLC",
      },
    ],
  },
};

export const createVehicleOwner = {
  corporationName: {
    id: "nameCorporation",
    label: "Name of Entity",
    isRequire: true,
  },
  // registeredDate: {
  //   id: "registeredDate",
  //   label: "Registered Date",
  //   isRequire: true,
  // },
  ein: {
    id: "ein",
    label: "EIN",
    isRequire: true,
  },

  addressLine1: {
    id: "addressLine1",
    label: "Address Line 1",
    isRequire: true,
  },
  addressLine2: {
    id: "addressLine2",
    label: "Address Line 2",
  },
  city: {
    id: "city",
    label: "City",
    isRequire: true,
  },
  state: {
    id: "state",
    label: "State",
    isRequire: true,
    options: statesOptions,
  },
  zip: {
    id: "zip",
    label: "ZIP",
    isRequire: true,
  },
  secAddressLine1: {
    id: "secAddressLine1",
    label: "Address Line 1",
    isRequire: true,
  },
  secAddressLine2: {
    id: "secAddressLine2",
    label: "Address Line 2",
  },
  secCity: {
    id: "secCity",
    label: "City",
    isRequire: true,
  },
  secState: {
    id: "secState",
    label: "State",
    isRequire: true,
  },
  secZip: {
    id: "secZip",
    label: "ZIP",
    isRequire: true,
  },
  cpFirstName: {
    id: "cpFirstName",
    label: "First Name",
    isRequire: true,
  },
  cpMiddleName: {
    id: "cpMiddleName",
    label: "Middle Name",
  },
  cpLastName: {
    id: "cpLastName",
    label: "Last Name",
    isRequire: true,
  },
  cpSSN: {
    id: "cpSSN",
    label: "SSN",
    isRequire: true,
  },
  cpDob: {
    id: "cpDob",
    label: "D.O.B",
    // isRequire: true,
  },
  cpPassportExpiryDate: {
    id: "cpPassportExpiryDate",
    label: "Passport Expiry Date",
    isRequire: true,
  },
  cpAddressLine1: {
    id: "cpAddressLine1",
    label: "Address Line 1",
    isRequire: true,
  },
  cpAddressLine2: {
    id: "cpAddressLine2",
    label: "Address Line 2",
  },
  cpCity: {
    id: "cpCity",
    label: "City",
    isRequire: true,
  },
  cpState: {
    id: "cpState",
    label: "State",
    isRequire: true,
  },
  cpZip: {
    id: "cpZip",
    label: "ZIP",
    isRequire: true,
  },
  contactNumber: {
    id: "contactNumber",
    label: "Contact Number",
  },
  emailAddress: {
    id: "emailAddress",
    label: "Email Address",
  },
  payTo: {
    id: "payTo",
    label: "Pay To",
    inputType: "RADIO",
    size: "xl",
    options: [
      { value: "Check", label: "Check" },
      { value: "ACH", label: "ACH" },
    ],
  },
  bank_routing_number: {
    id: "bank_routing_number",
    label: "Route Number",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  bankName: {
    id: "bankName",
    label: "Bank Name",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  bankAccountNumber: {
    id: "bankAccountNumber",
    label: "Bank Account Number",
    useGrouping: false,
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  confirmBankAccountNumber: {
    id: "confirmBankAccountNumber",
    label: "Confirm Bank Account Number",
    useGrouping: false,
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  payee: {
    id: "payee",
    label: "Payee",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  bankAccountName: {
    id: "bankAccountName",
    label: "Bank Account Name",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  payAddressLine1: {
    id: "payAddressLine1",
    label: "Address Line 1",
    inputType: "INPUT",
    size: "lg",
  },
  payAddressLine2: {
    id: "payAddressLine2",
    label: "Address Line 2",
    inputType: "INPUT",
    size: "lg",
  },
  payeeCity: {
    id: "payeeCity",
    label: "City",
    inputType: "INPUT",
    size: "sm",
  },
  payeeState: {
    id: "payeeState",
    label: "State",
    inputType: "INPUT",
    size: "sm",
  },
  payeeZip: {
    id: "payeeZip",
    label: "ZIP",
    inputType: "INPUT",
    size: "sm",
  },
  payeeProof: {
    id: "payeeProof",
    label: "Payee Proof",
    isRequire: true,
  },
  effectiveFrom: {
    id: "effectiveFrom",
    label: "Effective From",
    inputType: "CALENDAR",
    size: "md",
  },
  checkPayee: {
    id: "checkPayee",
    label: "Payee",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
};
export const enterMedallionStorage = [
  {
    id: "datePlacedInStorage",
    label: "Date Placed in Storage",
    inputType: "CALENDAR",
    isRequire: true,
    size: "sm",
    minDate: new Date(),
  },
  {
    id: "rateCard",
    label: "Rate Card",
    inputType: "CALENDAR",
    size: "sm",
  },
  // {
  //   id: "uploadRateCard",
  //   label: "Upload Rate Card",
  //   inputType: "UPLOAD",
  //   size: "sm",
  // },
  {
    id: "printName",
    label: "Print Name",
    inputType: "SELECT",
    options: [
      { name: "Carl Weaver", code: "CarlWeaver" },
      { name: "Sylvia Barrezuta", code: "Sylvia Barrezuta" },
    ],
    size: "sm",
  },
  {
    id: "storageDate",
    label: "Storage Date",
    inputType: "CALENDAR",
    size: "sm",
    minDate: new Date(),
  },
  {
    id: "reasonforPlacinginStorage",
    label: "Reason for Placing in Storage",
    inputType: "SELECT",
    options: [
      {
        name: "Medallion Leaving Management",
        code: "Medallion Leaving Management",
      },
      { name: "Shortage of Drivers", code: "Shortage of Drivers" },
      {
        name: "Others",
        code: "Others",
      },
    ],
    size: "md",
  },
];

export const updateMedallionStorage = [
  {
    id: "storage_date",
    label: "Date",
    inputType: "CALENDAR",
    isRequire: true,
    size: "sm",
  },
  {
    id: "uploadStorageReceipt",
    label: "Upload Storage Receipt",
    inputType: "UPLOAD",
    size: "sm",
  },
  {
    id: "uploadAcknowledgementReceipt",
    label: "Upload Acknowledgement Receipt",
    inputType: "UPLOAD",
    size: "md",
  },
];

export const retrieveMedallionStorage = [
  // {
  //     id:"medallionNumber",
  //     label:"Medallion Number",
  //     inputType: "INPUT",
  //     size:'sm'
  // },
  {
    id: "retrievalDate",
    label: "Retrieval Date",
    inputType: "CALENDAR",
    isRequire: true,
    size: "sm",
    minDate: new Date(),
  },
  // {
  //   id: "retrievedBy",
  //   label: "Retrieved By",
  //   inputType: "INPUT",
  //   isRequire: true,
  //   size: "md",
  // },
  {
    id: "retrievedBy",
    label: "Retrieved By",
    inputType: "SELECT",
    options: [{ name: "No records found", code: "No records found" }],
    size: "md",
    isRequire: true,
  },
];

export const medallionLeaseCancel = [
  {
    id: "payTo",
    label: "Pay To",
    inputType: "RADIO",
    size: "xl",
    options: [
      { value: "check", label: "Check" },
      { value: "ACH", label: "ACH" },
    ],
  },
  {
    id: "bankName",
    label: "Bank Name",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "bankAccountNumber",
    label: "Bank Account Number",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "payee",
    label: "Payee",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "addressLine1",
    label: "Address Line 1",
    inputType: "INPUT",
    size: "lg",
  },
  {
    id: "addressLine2",
    label: "Address Line 2",
    inputType: "INPUT",
    size: "lg",
  },
  {
    id: "city",
    label: "City",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "state",
    label: "State",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "zip",
    label: "ZIP",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "effectiveFrom",
    label: "Effective From",
    inputType: "CALENDAR",
    size: "md",
    isRequire: true,
  },
  {
    id: "checkPayee",
    label: "Payee",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
];

export const enterPayeeDetail = [
  {
    id: "payTo",
    label: "Pay To",
    inputType: "RADIO",
    size: "xl",
    options: [
      { value: "check", label: "Check" },
      { value: "ACH", label: "ACH" },
    ],
  },
  {
    id: "bank_routing_number",
    label: "Routing Number",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "bankName",
    label: "Bank Name",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "bankAccountNumber",
    label: "Bank Account Number",
    inputType: "INPUT",
    size: "sm",
    useGrouping: false,
    isRequire: true,
  },
  {
    id: "confirmBankAccountNumber",
    label: "Confirm Bank Account Number",
    inputType: "INPUT",
    size: "sm",
    useGrouping: false,
    isRequire: true,
  },
  {
    id: "payee",
    label: "Payee",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "bankAccountName",
    label: "Bank Account Name",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "addressLine1",
    label: "Address Line 1",
    inputType: "INPUT",
    size: "lg",
  },
  {
    id: "addressLine2",
    label: "Address Line 2",
    inputType: "INPUT",
    size: "lg",
  },
  {
    id: "city",
    label: "City",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "state",
    label: "State",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "zip",
    label: "ZIP",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "effectiveFrom",
    label: "Effective From",
    inputType: "CALENDAR",
    size: "md",
  },
  {
    id: "checkPayee",
    label: "Payee",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
];

export const enterMedallionPayeeDetail = [
  {
    id: "payTo",
    label: "Pay To",
    inputType: "RADIO",
    size: "xl",
    options: [
      { value: "check", label: "Check" },
      { value: "ACH", label: "ACH" },
    ],
  },
  {
    id: "bank_routing_number",
    label: "Route Number",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "bankName",
    label: "Bank Name",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "bankAccountNumber",
    label: "Bank Account Number",
    useGrouping: false,
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "confirmBankAccountNumber",
    label: "Confirm Bank Account Number",
    useGrouping: false,
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "payee",
    label: "Payee",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "bankAccountName",
    label: "Bank Account Name",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "addressLine1",
    label: "Address Line 1",
    inputType: "INPUT",
    size: "lg",
  },
  {
    id: "addressLine2",
    label: "Address Line 2",
    inputType: "INPUT",
    size: "lg",
  },
  {
    id: "city",
    label: "City",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "state",
    label: "State",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "zip",
    label: "ZIP",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "effectiveFrom",
    label: "Effective From",
    inputType: "CALENDAR",
    size: "md",
  },
  {
    id: "checkPayee",
    label: "Payee",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
];

export const enterDriverPayeeDetail = [
  {
    id: "pay_to_mode",
    label: "Pay To",
    inputType: "RADIO",
    size: "xl",
    options: [
      { value: "Check", label: "Check" },
      { value: "ACH", label: "ACH" },
    ],
  },
  {
    id: "bank_routing_number",
    label: "Routing Number",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "bankName",
    label: "Bank Name",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "bankAccountNumber",
    label: "Bank Account Number",
    useGrouping: false,
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "confirmBankAccountNumber",
    label: "Confirm Bank Account Number",
    useGrouping: false,
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "pay_to",
    label: "Payee",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "bankAccountName",
    label: "Bank Account Name",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "addressLine1",
    label: "Address Line 1",
    inputType: "INPUT",
    size: "lg",
  },
  {
    id: "addressLine2",
    label: "Address Line 2",
    inputType: "INPUT",
    size: "lg",
  },
  {
    id: "city",
    label: "City",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "state",
    label: "State",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "zip",
    label: "ZIP",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "effectiveFrom",
    label: "Effective From",
    inputType: "CALENDAR",
    size: "md",
  },
  {
    id: "checkPayee",
    label: "Payee",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
];

export const dmvdriverUpdateLicense = [
  {
    id: "is_dmv_license_active",
    label: "Active",
    inputType: "RADIO",
    size: "xl",
    options: [
      { value: true, label: "Yes" },
      { value: false, label: "No" },
    ],
  },
  {
    id: "dmv_license_number",
    label: "DMV License Number",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "dmv_license_issued_state",
    label: "DMV License Issued State",
    inputType: "SELECT",
    size: "sm",
    options: statesOptions,
    isRequire: true,
  },
  {
    id: "dmv_class",
    label: "Class",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "dmv_license_status",
    label: "DMV License Status",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "dmv_class_change_date",
    label: "Class Change Date",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "dmv_license_expiry_date",
    label: "DMV License Expiry Date",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
    minDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
  // {
  //   id: "dmv_renewal_fee",
  //   label: "Renewal Fee",
  //   inputType: "INPUT",
  //   keyfilter: "pint",
  //   size: "sm",
  // },
];

export const tlcDriverUpdateLicense = [
  {
    id: "tlc_license_number",
    label: "TLC License Number",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "tlc_issued_state",
    label: "TLC Issued State",
    inputType: "SELECT",
    size: "sm",
    options: statesOptions,
  },
  {
    id: "tlc_license_expiry_date",
    label: "TLC Expiry Date",
    inputType: "CALENDAR",
    size: "sm",
    isRequire: true,
    minDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
  {
    id: "tlc_drug_test_date",
    label: "Drug Test Date",
    inputType: "CALENDAR",
    size: "sm",
  },
  {
    id: "tlc_lease_card_date",
    label: "Lease Card Date",
    inputType: "CALENDAR",
    size: "sm",
  },

  // {
  //   id: "previous_tlc_license_number",
  //   label: "Previous TLC License No",
  //   inputType: "INPUT",
  //   size: "sm",
  // },
  // {
  //   id: "tlc_hack_date",
  //   label: "Hack Date",
  //   inputType: "CALENDAR",
  //   size: "sm",
  // },
  // {
  //   id: "tlc_ddc_date",
  //   label: "DDC Date",
  //   inputType: "CALENDAR",
  //   size: "sm",
  // },
  // {
  //   id: "tlc_renewal_fee",
  //   label: "Renewal Fee",
  //   inputType: "INPUT",
  //   size: "sm",
  // },
];

export const medallionAddress = [
  {
    id: "addressLine1",
    label: "Address Line 1",
    inputType: "INPUT",
    isRequire: true,
    size: "lg",
  },
  {
    id: "addressLine2",
    label: "Address Line 2",
    inputType: "INPUT",
    size: "lg",
  },
  {
    id: "city",
    label: "City",
    inputType: "INPUT",
    isRequire: true,
    size: "sm",
  },
  {
    id: "state",
    label: "State",
    inputType: "SELECT",
    isRequire: true,
    size: "sm",
    options: statesOptions,
  },
  {
    id: "zip",
    label: "ZIP",
    inputType: "INPUT",
    isRequire: true,
    size: "sm",
  },
  {
    id: "phone_1",
    label: "Phone Number 1",
    inputType: "INPUT",
    isRequire: true,
    size: "sm",
  },
  {
    id: "phone_2",
    label: "Phone Number 2",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "email",
    label: "Email Address",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
];
export const medallionSecondaryAddress = {
  secondaryAddress1: {
    id: "secondaryAddress1",
    label: "Address Line 1",
    // isRequire: true,
  },
  secondaryAddress2: {
    id: "secondaryAddress2",
    label: "Address Line 2",
  },
  secondaryCity: {
    id: "secondaryCity",
    label: "City",
    // isRequire: true,
  },
  secondaryState: {
    id: "secondaryState",
    label: "State",
    // isRequire: true,
    options: statesOptions,
  },
  secondaryZip: {
    id: "secondaryZip",
    label: "ZIP",
    // isRequire: true,
  },
};

export const driverUpdateAddress = [
  {
    id: "address_line_1",
    label: "Address Line 1",
    inputType: "INPUT",
    isRequire: true,
    size: "lg",
  },
  {
    id: "address_line_2",
    label: "Address Line 2",
    inputType: "INPUT",
    size: "lg",
  },
  {
    id: "city",
    label: "City",
    inputType: "INPUT",
    isRequire: true,
    size: "sm",
  },
  {
    id: "state",
    label: "State",
    inputType: "SELECT",
    isRequire: true,
    options: statesOptions,
    size: "sm",
  },
  {
    id: "zip",
    label: "ZIP",
    inputType: "INPUT",
    isRequire: true,
    size: "sm",
  },
  {
    id: "poBox",
    label: "P.O Box",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "secaddressLine1",
    label: "Address Line 1",
    inputType: "INPUT",
    size: "lg",
  },
  {
    id: "secaddressLine2",
    label: "Address Line 2",
    inputType: "INPUT",
    size: "lg",
  },
  {
    id: "seccity",
    label: "City",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "secstate",
    label: "State",
    size: "sm",
    inputType: "SELECT",
    options: statesOptions,
  },
  {
    id: "seczip",
    label: "ZIP",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "secPOBox",
    label: "P.O Box",
    inputType: "INPUT",
    size: "sm",
  },
];

export const vehicleDetail1 = [
  {
    id: "vin",
    label: "VIN",
    inputType: "INPUT",
    isRequire: true,
    size: "sm",
  },
  {
    id: "tpep_provider",
    label: "TSP Provider",
    inputType: "SELECT",
    options: [{ name: "CURB", code: "CURB" }],
    isDisable: false,
    size: "sm",
  },
  {
    size: "sm",
    id: "configuration_type",
    label: "Security Type",
    inputType: "SELECT",
    isRequire: true,
    options: [
      { name: "Camera", code: "Camera" },
      { name: "Partition", code: "Partition" },
    ],
  },
  {
    id: "make",
    label: "Make",
    inputType: "INPUT",
    isRequire: true,
    size: "sm",
  },
  {
    id: "model",
    label: "Model",
    inputType: "INPUT",
    isRequire: true,
    size: "sm",
  },
  {
    id: "year",
    label: "Year",
    inputType: "CALENDAR",
    view: "year",
    dateFormat: "yy",
    maxDate: new Date(),
    isRequire: true,
    size: "sm",
  },
  {
    id: "cylinders",
    label: "Cylinder",
    inputType: "INPUT",
    isRequire: true,
    size: "sm",
  },
  // {
  //   id: "color",
  //   label: "Color",
  //   inputType: "INPUT",
  //   isRequire: true,
  //   size: "sm",
  // },
  {
    id: "vehicle_type",
    label: "Vehicle Type",
    inputType: "SELECT",
    options: [
      { name: "WAV Hybrid", code: "WAV Hybrid" },
      { name: "WAV Gas", code: "WAV Gas" },
      { name: "Non-WAV Hybrid", code: "Non-WAV Hybrid" },
      { name: "Non-WAV Gas", code: "Non-WAV Gas" },
    ],
    isRequire: true,
    size: "sm",
  },
  // {
  //   id: "is_hybrid",
  //   label: "Hybrid",
  //   inputType: "RADIO",
  //   isRequire: true,
  //   options: [
  //     { value: true, label: "Yes" },
  //     { value: false, label: "No" },
  //   ],
  //   size: "sm",
  // },
  {
    id: "dealer_name",
    label: "Dealer Name",
    inputType: "INPUT",
    isRequire: true,
    size: "sm",
  },
  // {
  //     id: "dealer_bank_name",
  //     label: "Dealer Bank Name",
  //     inputType: "INPUT",
  //     isRequire: true,
  //     size: 'sm'
  // },
  // {
  //     id: "dealer_bank_account_number",
  //     label: "Dealer Account Number",
  //     inputType: "INPUT",
  //     isRequire: true,
  //     size: 'sm'
  // },
  // {
  //   id: "vehicle_office",
  //   label: "Vehicle Office",
  //   inputType: "INPUT",
  //   size: "sm",
  // },
];

export const vehicleDetail2 = [
  {
    id: "invoice_number",
    label: "Invoice Number",
    inputType: "INPUT",
    size: "sm",
    editable: true,
    isRequire: true,
  },
  {
    id: "invoice_date",
    label: "Invoice Date",
    inputType: "CALENDAR",
    size: "sm",
    maxDate: new Date(),
    editable: true,
    isRequire: true,
  },
  {
    id: "base_price",
    label: "Base Cost",
    inputType: "INPUT",
    size: "sm",
    editable: true,
    isRequire: true,
  },
  {
    id: "sales_tax",
    label: "Sales Tax",
    inputType: "INPUT",
    size: "sm",
    editable: true,
  },
  // { id: "vehicle_total_price", label: "Total Cost", inputType: "INPUT", size: "sm", editable: false, disabled: false }
];

export const dealerDetail = [
  {
    id: "dealer_name",
    label: "Dealer Name",
    inputType: "INPUT",
    isRequire: true,
    dataTestId: "dealer_name_modal",
    size: "sm",
  },
  // {
  //   id: "dealer_bank_name",
  //   label: "Dealer Bank Name",
  //   inputType: "INPUT",
  //   isRequire: true,
  //   dataTestId: "dealer_bank_name_modal",
  //   size: "sm",
  // },
  // {
  //   id: "dealer_bank_account_number",
  //   label: "Dealer Account Number",
  //   inputType: "INPUT",
  //   isRequire: true,
  //   dataTestId: "dealer_bank_account_number_modal",
  //   size: "sm",
  // },
];

export const vehicleDeliveryDetail = [
  {
    id: "expected_delivery_date",
    label: "Expected Delivery Date",
    minDate: new Date(),
    inputType: "CALENDAR",
    size: "sm",
  },
  {
    id: "delivery_location",
    label: "Delivery Location",
    inputType: "SELECT",
    options: [
      { name: "BAT Garage", code: "BAT Garage" },
      { name: "Maaco", code: "Maaco" },
      { name: "Metro Shop", code: "Metro Shop" },
      { name: "Taxicab Products", code: "Taxicab Products" },
    ],
    size: "sm",
    isRequire: true,
  },
  {
    id: "note",
    label: "Note",
    inputType: "INPUT",
    size: "xl",
  },
];

export const vehicleDeliveryDetailUpdate = [
  {
    id: "expected_delivery_date",
    label: "Delivery Date",
    maxDate: new Date(),
    inputType: "CALENDAR",
    size: "sm",
    isRequire: true,
  },
  {
    id: "delivery_location",
    label: "Delivery Location",
    inputType: "SELECT",
    options: [
      { name: "BAT Garage", code: "BAT Garage" },
      { name: "Maaco", code: "Maaco" },
      { name: "Metro Shop", code: "Metro Shop" },
      { name: "Taxicab Products", code: "Taxicab Products" },
    ],
    size: "sm",
    isRequire: true,
  },
  {
    id: "note",
    label: "Note",
    inputType: "INPUT",
    size: "xl",
  },
];
export const vehicleDeliveryHackUpDetail = [
  {
    id: "cameraType",
    label: "Camera Type",
    inputType: "SELECT",
    options: [
      { name: "247 TVS 21 V1 ( 10 )", code: "247 TVS 21 V1 ( 10 )" },
      {
        name: "AT&C Taxi Camera Model 119 ( 79 )",
        code: "AT&C Taxi Camera Model 119 ( 79 )",
      },
      { name: "247 TVS V2 ( 202 )", code: "247 TVS V2 ( 202 )" },
      { name: "VERIFEYE MARK 4 ( 1 )", code: "VERIFEYE MARK 4 ( 1 )" },
      { name: "VERIFEYE G6 ( 4 )", code: "VERIFEYE G6 ( 4 )" },
      { name: "Night Vision Camera", code: "Night Vision Camera" },
      { name: "Parking Camera", code: "Parking Camera" },
    ],
    size: "sm",
    isRequire: true,
  },
  {
    id: "cameraLocation",
    label: "Camera Location",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },

  {
    id: "meterType",
    label: "Meter Type",
    inputType: "SELECT",
    options: [
      { name: "Fuel Meter", code: "Fuel Meter" },
      { name: "Speedometer", code: "Speedometer" },
      { name: "Odometer", code: "Odometer" },
      { name: "Tachometer", code: "Tachometer" },
      { name: "Battery Meter", code: "Battery Meter" },
      { name: "Energy Consumption Meter", code: "Energy Consumption Meter" },
      { name: "Temperature Meter", code: "Temperature Meter" },
      { name: "Trip Meter", code: "Trip Meter" },
    ],
    size: "xs",
    isRequire: true,
  },
  {
    id: "meterLocation",
    label: "Meter Location",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "roofTopType",
    label: "Roof Top Type",
    inputType: "SELECT",
    options: [
      { name: "Sunroof", code: "Sunroof" },
      { name: "Moonroof", code: "Moonroof" },
      { name: "Convertible", code: "Convertible" },
      { name: "Hardtop", code: "Hardtop" },
    ],
    size: "sm",
    isRequire: true,
  },
  {
    id: "roofTopLocation",
    label: "Roof Top Location",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },

  {
    id: "dmvRegLocation",
    label: "DMV Reg Location",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "tlcInspectionLocation",
    label: "TLC Inspection Location",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
];
export const vehicleDeliveryCompletion = [
  {
    id: "is_delivered",
    label: "Vehicle Delivered",
    inputType: "RADIO",
    options: [
      { label: "Yes", value: true, id: "check" },
      { label: "No", value: false, id: "ach" },
    ],
    size: "sm",
  },
  {
    id: "is_insurance_procured",
    label: "Insurance Procured",
    inputType: "RADIO",
    options: [
      { label: "Yes", value: true, id: "check" },
      { label: "No", value: false, id: "ach" },
    ],
    size: "sm",
  },
  {
    id: "tlc_hackup_inspection_date",
    label: "TLC Hackup Inspection Date",
    inputType: "CALENDAR",
    size: "sm",
  },
  {
    id: "notes",
    label: "Notes",
    size: "sm",
  },
];

export const getOptionsByIdFromVariable = (list, id) => {
  for (const group of list) {
    if (Array.isArray(group)) {
      for (const item of group) {
        if (item.id === id) {
          return item.options || [];
        }
      }
    } else if (group.id === id) {
      return group.options || [];
    }
  }
  return [];
};

export const getVariableById = (list, id) => {
  const field = list.find((item) => item.id === id);
  return field;
};

export const newDriverSearch = [
  {
    id: "tlcLicenseNumber",
    label: "TLC License No",
    inputType: "INPUT",
    // size: "sm",
  },
  {
    id: "dmvLicenseNumber",
    label: "DMV License No",
    inputType: "INPUT",
    // size: "sm",
  },
  {
    id: "ssn",
    label: "SSN",
    inputType: "INPUT",
    // size: "sm",
  },
];

export const newDriverDetail = [
  // {
  //   id: "dmvLicenseActive",
  //   label: "DMV License Active",
  //   inputType: "RADIO",
  //   size: "sm",
  //   options: [
  //     { value: "Yes", label: "Yes" },
  //     { value: "No", label: "No" },
  //   ],
  // },
  // {
  //   id: "tlcLicenseActive",
  //   label: "TLC License Active",
  //   inputType: "RADIO",
  //   size: "lg",
  //   options: [
  //     { value: "Yes", label: "Yes" },
  //     { value: "No", label: "No" },
  //   ],
  // },
  {
    id: "tlcLicenseNumber",
    label: "TLC License Number",
    isRequire: true,
    inputType: "VIEW_FILE",
    size: "sm",
  },
  {
    id: "tlcLicenseExpiryDate",
    label: "TLC License Expiry Date",
    inputType: "CALENDAR",
    isRequire: true,
    size: "sm",
    minDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
  {
    id: "dmvLicenseNumber",
    label: "DMV License Number",
    inputType: "VIEW_FILE",
    isRequire: true,
    size: "sm",
  },
  // {
  //   id: "dmvLicenseIssuedState",
  //   label: "DMV License Issued State",
  //   isRequire: true,
  //   inputType: "INPUT",
  //   size: "sm",
  // },
  {
    id: "dmvLicenseIssuedState",
    label: "DMV License Issued State",
    inputType: "SELECT",
    size: "sm",
    isRequire: true,
    options: statesOptions,
  },

  {
    id: "dmvLicenseExpiryDate",
    label: "DMV License Expiry Date",
    inputType: "CALENDAR",
    isRequire: true,
    size: "sm",
    minDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
  {
    id: "violationDueAtRegistration",
    label: "Upload Violation Receipt",
    inputType: "VIOLATION_VIEW_FILE",
    // isRequire: true,
    size: "sm",
  },
  // {
  //   id: "violationDueAtRegistration",
  //   label: "Upload Violation Receipt",
  //   inputType: "UPLOAD_ONLY",
  //   isRequire: true,
  //   size: "sm",
  // },
];

export const newDriverPersonalDetail = [
  {
    id: "firstName",
    label: "First Name",
    inputType: "INPUT",
    isRequire: true,
    size: "sm",
  },
  {
    id: "middleName",
    label: "Middle Name",
    inputType: "INPUT",
    size: "sm",
  },

  {
    id: "lastName",
    label: "Last Name",
    inputType: "INPUT",
    isRequire: true,
    size: "sm",
  },
  {
    id: "ssn",
    label: "SSN",
    inputType: "VIEW_FILE_SSN",
    isRequire: true,
    size: "sm",
  },
  {
    id: "confirmssn",
    label: "Confirm SSN",
    inputType: "FORMATTED_SSN",
    isRequire: true,
    size: "sm",
  },
  // {
  //   id: "driverType",
  //   label: "Driver Type",
  //   inputType: "SELECT",
  //   size: "sm",
  //   options: [
  //     { name: "WAV", code: "WAV" },
  //     { name: "Regular", code: "Regular" },
  //   ],
  // },
  {
    id: "uploadPhoto",
    label: "Upload Driver Photo",
    inputType: "UPLOAD",
    size: "sm",
  },
  // {
  //   id: "maritalStatus",
  //   label: "Marital Status",
  //   inputType: "INPUT",
  //   size: "sm",
  // },
  {
    id: "dob",
    label: "D.O.B",
    inputType: "CALENDAR",
    size: "sm",
    maxDate: new Date(new Date().setFullYear(new Date().getFullYear() - 18)),
    viewDate: new Date(new Date().setFullYear(new Date().getFullYear() - 18)),
  },
  // {
  //   id: "gender",
  //   label: "Gender",
  //   inputType: "INPUT",
  //   size: "sm",
  // },
  {
    id: "Phone1",
    label: "Mobile Number",
    inputType: "INPUT",
    isRequire: true,
    size: "sm",
  },
  {
    id: "Phone2",
    label: "Alternate Mobile Number",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "emailID",
    label: "Email ID",
    inputType: "INPUT",
    size: "sm",
  },
];

export const newDriverAddress = [
  {
    id: "addressLine1",
    label: "Address Line 1",
    inputType: "INPUT",
    isRequire: true,
    size: "lg",
  },
  {
    id: "addressLine2",
    label: "Address Line 2",
    inputType: "INPUT",
    size: "lg",
  },
  {
    id: "city",
    label: "City",
    inputType: "INPUT",
    isRequire: true,
    size: "sm",
  },
  // {
  //   id: "state",
  //   label: "State",
  //   inputType: "INPUT",
  //   isRequire: true,
  //   size: "sm",
  // },
  {
    id: "state",
    label: "State",
    inputType: "SELECT",
    size: "sm",
    options: statesOptions,
    isRequire: true,
  },
  {
    id: "zip",
    label: "ZIP",
    inputType: "INPUT",
    isRequire: true,
    size: "sm",
  },
  // {
  //   id: "latitude",
  //   label: "Latitude",
  //   inputType: "INPUT",
  //   size: "sm",
  // },
  // {
  //   id: "longitude",
  //   label: "Longitude",
  //   inputType: "INPUT",
  //   size: "sm",
  // },
  {
    id: "mailingAddress",
    label: "Mailing address is same as default",
    inputType: "CHECK",
    size: "lg",
    options: [{ value: "yes", label: "Mailing address is same as default" }],
  },
];

export const newDriverSecondaryAddress = [
  {
    id: "addressLine1Secondary",
    label: "Address Line 1",
    inputType: "INPUT",
    size: "lg",
    isRequire: true,
  },
  {
    id: "addressLine2Secondary",
    label: "Address Line 2",
    inputType: "INPUT",
    size: "lg",
  },
  {
    id: "citySecondary",
    label: "City",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "stateSecondary",
    label: "State",
    inputType: "SELECT",
    size: "sm",
    options: statesOptions,
    isRequire: true,
  },

  {
    id: "zipSecondary",
    label: "ZIP",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  // {
  //   id: "latitudeSecondary",
  //   label: "Latitude",
  //   inputType: "INPUT",
  //   size: "sm",
  // },
  // {
  //   id: "longitudeSecondary",
  //   label: "Longitude",
  //   inputType: "INPUT",
  //   size: "sm",
  // },
];

export const newDriverPayeeDetail = [
  {
    id: "pay_to_mode",
    label: "Pay To",
    inputType: "RADIO",
    size: "xl",
    options: [
      { value: "Check", label: "Check" },
      { value: "ACH", label: "ACH" },
    ],
  },
  {
    id: "bank_routing_number",
    label: "Routing Number",
    inputType: "INPUT",
    size: "sm",
    isCheck: false,
    isRequire: true,
  },
  {
    id: "bankName",
    label: "Bank Name",
    inputType: "INPUT",
    size: "sm",
    isCheck: false,
    isRequire: true,
  },
  {
    id: "bankAccountNumber",
    label: "Bank Account Number",
    useGrouping: false,
    inputType: "INPUT",
    size: "sm",
    isCheck: false,
    isRequire: true,
  },
  {
    id: "confirmBankAccountNumber",
    label: "Confirm Bank Account Number",
    useGrouping: false,
    inputType: "INPUT",
    size: "sm",
    isCheck: false,
    isRequire: true,
  },
  {
    id: "pay_to",
    label: "Payee",
    inputType: "INPUT",
    size: "sm",
    isCheck: false,
    isRequire: true,
  },
  // {
  //   id: "bankAccountName",
  //   label: "Bank Account Name",
  //   inputType: "INPUT",
  //   size: "sm",
  //   isCheck: false,
  //   isRequire: true,
  // },
  // {
  //   id: "addressLine1Payee",
  //   label: "Address Line 1",
  //   inputType: "INPUT",
  //   isCheck: false,
  //   size: "lg",
  // },
  // {
  //   id: "addressLine2Payee",
  //   label: "Address Line 2",
  //   inputType: "INPUT",
  //   isCheck: false,
  //   size: "lg",
  // },
  // {
  //   id: "cityPayee",
  //   label: "City",
  //   inputType: "INPUT",
  //   isCheck: false,
  //   size: "sm",
  // },
  // {
  //   id: "statePayee",
  //   label: "State",
  //   inputType: "INPUT",
  //   isCheck: false,
  //   size: "sm",
  // },
  // {
  //   id: "zipPayee",
  //   label: "ZIP",
  //   inputType: "INPUT",
  //   isCheck: false,
  //   size: "sm",
  // },
  // {
  //   id: "effectiveFrom",
  //   label: "Effective From",
  //   inputType: "CALENDAR",
  //   isCheck: false,
  //   size: "sm",
  // },
  {
    id: "payeeProof",
    label: "Effective From",
    inputType: "PAYEE_PROOF_UPLOAD",
    isCheck: false,
    size: "sm",
  },

  {
    id: "payeeCheck",
    label: "Payee",
    inputType: "INPUT",
    size: "sm",
    isCheck: true,
    isRequire: true,
  },
];

export const newDriverMorePaymentOption = [
  {
    id: "paybyCash",
    label: "Pay by Cash",
    inputType: "CHECK",
    size: "sm",
  },
  {
    id: "paybyChecks",
    label: "Pay by Checks",
    inputType: "CHECK",
    size: "sm",
  },
  {
    id: "payByCreditCard",
    label: "Pay by Credit Card",
    inputType: "CHECK",
    size: "sm",
  },
  {
    id: "enterCreditCardNumber",
    label: "Enter Credit Card Number",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
];
export const newDriveEmergencyNumber = [
  {
    id: "nameOfThePerson",
    label: "Name of the Person",
    inputType: "INPUT",
    size: "sm",
    // isRequire: true,
  },
  {
    id: "relationship",
    label: "Relationship",
    inputType: "SELECT",
    size: "sm",
    // isRequire: true,
    options: relationshipOptions,
  },
  {
    id: "contactNumber",
    label: "Contact Number",
    inputType: "INPUT",
    size: "sm",
    // isRequire: true,
  },
];
export const newDriveAddtionalEmergencyNumber = [
  {
    id: "nameOfThePersonAddtional",
    label: "Name of the Person",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "relationshipAddtional",
    label: "Relationship",
    inputType: "SELECT",
    size: "sm",
    options: [
      { name: "Father", code: "FATHER" },
      { name: "Mother", code: "MOTHER" },
      { name: "Spouse", code: "SPOUSE" },
      { name: "Son", code: "SON" },
      { name: "Daughter", code: "DAUGHTER" },
      { name: "Brother", code: "BROTHER" },
      { name: "Sister", code: "SISTER" },
      { name: "Guardian", code: "GUARDIAN" },
      { name: "Friend", code: "FRIEND" },
      { name: "Other", code: "OTHER" },
    ],
  },
  {
    id: "contactNumberAddtional",
    label: "Contact Number",
    inputType: "INPUT",
    size: "sm",
  },
];

export const enterLeaseDetails = {
  field_01: {
    id: "lease_id",
    label: "Lease ID",
  },
  field_02: {
    id: "lease_type",
    label: "Lease Type",
    isRequire: true,
    options: [
      { name: "DOV - Driver Owned Vehicle", code: "dov", disabled: false },
      { name: "Long Term", code: "long-term", disabled: false },
      { name: "Medallion-Only", code: "medallion-only", disabled: false },
      { name: "Shift Lease", code: "shift-lease", disabled: false },
      { name: "Short Term", code: "short-term", disabled: true },
      { name: "Full Weekly", code: "fully-weekly", disabled: true },
    ],
  },
  field_03: {
    id: "total_weeks",
    isRequire: true,
    label: "Total Weeks",
    value: 26,
    min: 0,
    isDisable: true,
  },
  field_04: {
    id: "lease_start_date",
    isRequire: true,
    label: "Lease Start Date",
  },
  field_05: {
    id: "lease_end_date",
    label: "Lease End Date",
    isDisable: true,
  },
  // field_06: {
  //     id: "pay_day",
  //     isRequire: true,
  //     label: "Pay Day",
  //     multiple: false,
  //     options: [
  //         { name: 'S', code: 'sun' },
  //         { name: 'M', code: 'mon' },
  //         { name: 'T', code: 'tus' },
  //         { name: 'W', code: 'wen' },
  //         { name: 'T', code: 'thu' },
  //         { name: 'F', code: 'fri' },
  //         { name: 'S', code: 'sat' },
  //     ]
  // },
  field_06: {
    id: "is_auto_renewal",
    label: "Auto Renewal",
    isDisable: true,
    options: [
      { value: true, label: "Yes", id: "yes" },
      { value: false, label: "No", id: "no" },
    ],
  },
  // field_07: {
  //   id: "is_day_night_shift",
  //   label: "Shifts",
  //   value: true,
  //   options: [
  //     { value: "day", label: "Day" },
  //     { value: "night", label: "Night" },
  //   ],
  // },

  field_07: {
    id: "is_day_night_shift",
    label: "Select Shift",
    isRequire: true,
    options: [
      { name: "Full Time Drivers", code: "full", disabled: false },
      { name: "Day Shift Drivers", code: "day", disabled: false },
      { name: "Night Shift Drivers", code: "night", disabled: false },
    ],
  },

  field_08: {
    id: "payments",
    label: "Deposit Paid",
    value: "advance",
    options: [
      { value: "prepaid", label: "Prepaid", id: "Prepaid" },
      { value: "advance", label: "Advance", id: "Advance" },
    ],
  },
  field_09: {
    id: "amount",
    label: "Amount",
    // value: "advance",
    // options: [
    //     { value: "behind", label: "Behind", id: "Behind" },
    //     { value: "advance", label: "Advance", id: "Advance" },
    // ],
  },
  field_10: {
    id: "cancellation_fee",
    label: "Cancellation Fee",
    keyfilter: "pnum",
    isRequire: true,
    min: 0,
  },

  field_11: {
    id: "current_segment",
    label: "Current Segment",
    keyfilter: "pnum",
    isRequire: true,
    min: 0,
    isDisable: true,
  },

  field_12: {
    id: "total_segment",
    label: "Total Segment",
    keyfilter: "pnum",
    isRequire: true,
    min: 0,
    isDisable: true,
  },
};

export const fullShiftOption = [
  { name: "Day Shift Drivers", code: "day", disabled: false },
  { name: "Night Shift Drivers", code: "night", disabled: false },
];

export const dayShiftOption = [
  { name: "Day Shift Drivers", code: "day", disabled: false },
];

export const nightShiftOption = [
  { name: "Night Shift Drivers", code: "night", disabled: false },
];

export const allLeaseOptions = [
  { name: "DOV - Driver Owned Vehicle", code: "dov", disabled: false },
  { name: "Long Term", code: "long-term", disabled: false },
  { name: "Medallion-Only", code: "medallion-only", disabled: false },
  { name: "Shift Lease", code: "shift-lease", disabled: false },
  { name: "Short Term", code: "short-term", disabled: true },
  { name: "Full Weekly", code: "fully-weekly", disabled: true },
];

export const shiftLeaseOptions = [
  { name: "Shift Lease", code: "shift-lease", disabled: false },
];

export const vechileHackup = [
  {
    id: "tpep_type",
    label: "TPEP Type",
    inputType: "SELECT",
    options: [],
    size: "md",
  },
  {
    id: "configuration_type",
    label: "Configuration Type",
    inputType: "SELECT",
    options: [
      { name: "Camera", code: "camera" },
      { name: "Partition", code: "partition" },
    ],
    size: "md",
  },
  {
    id: "paint",
    label: "Paint",
    inputType: "CHECK",
    size: "xxs",
  },
  {
    id: "camera",
    label: "Camera",
    inputType: "CHECK",
    size: "xxs",
  },
  {
    id: "partition",
    label: "Partition",
    inputType: "CHECK",
    size: "xxs",
  },
  {
    id: "meter",
    label: "Meter",
    inputType: "CHECK",
    size: "xxs",
  },
  {
    id: "rooftop",
    label: "Rooftop",
    inputType: "CHECK",
    size: "xxs",
  },
  {
    id: "paintCompletedDate",
    label: "Paint Completed Date",
    inputType: "CALENDAR",
    isCheck: false,
    size: "md",
  },
  {
    id: "paintInvoice",
    label: "Paint Invoice",
    inputType: "UPLOAD",
    size: "md",
  },
  {
    id: "cameraType",
    label: "Camera Type",
    inputType: "SELECT",
    options: [],
    size: "sm",
  },
  {
    id: "cameraInstalledDate",
    label: "Camera Installed Date",
    inputType: "CALENDAR",
    isCheck: false,
    size: "sm",
  },
  {
    id: "cameraInstalledInvoice",
    label: "Camera Installed Invoice",
    inputType: "UPLOAD",
    size: "sm",
  },

  {
    id: "meterType",
    label: "Meter Type",
    inputType: "SELECT",
    options: [],
    size: "xs",
  },
  {
    id: "meterInstalledDate",
    label: "Meter Installed Date",
    inputType: "CALENDAR",
    isCheck: false,
    size: "xs",
  },
  {
    id: "meterSerialNo",
    label: "Meter Serial No",
    inputType: "INPUT",
    size: "xs",
  },
  {
    id: "meterInstalledInvoice",
    label: "Meter Installed Invoice",
    inputType: "UPLOAD",
    size: "xs",
  },

  {
    id: "roofTopType",
    label: "Roof Top Type",
    inputType: "SELECT",
    options: [],
    size: "sm",
  },
  {
    id: "roofTopInstalledDate",
    label: "Roof Top Installed Date",
    inputType: "CALENDAR",
    isCheck: false,
    size: "sm",
  },
  {
    id: "rooftopInvoice",
    label: "Rooftop Invoice",
    inputType: "UPLOAD",
    size: "sm",
  },
];

export const registerVechile = [
  {
    id: "registrationDate",
    label: "Registration Date",
    inputType: "CALENDAR",
    isCheck: false,
    isRequire: true,
    size: "sm",
  },
  {
    id: "registrationExpiryDate",
    label: "Registration Expiry Date",
    inputType: "CALENDAR",
    isCheck: false,
    isRequire: true,
    size: "sm",
  },
  {
    id: "registrationFee",
    label: "Registration Fee",
    inputType: "UPLOAD",
    size: "sm",
  },
  {
    id: "uploadRegistrationCertificate",
    label: "Upload Registration Certificate",
    inputType: "UPLOAD",
    size: "sm",
  },
  {
    id: "plateNumber",
    label: "Plate No",
    inputType: "INPUT",
    size: "sm",
  },
];

export const inspectionHackup = [
  [
    {
      id: "inspectionType",
      label: "Inspection Type",
      inputType: "SELECT",
      options: [],
      size: "xl",
    },
  ],
  [
    {
      id: "mileRun",
      label: "Mile Run",
      inputType: "RADIO",
      size: "xl",
      options: [
        { value: true, label: "Yes" },
        { value: false, label: "No" },
      ],
    },
  ],
  [
    {
      id: "inspectionDate",
      label: "Inspection Date",
      inputType: "CALENDAR",
      size: "md",
    },
    {
      id: "inspectionTime",
      label: "Inspection Time",
      inputType: "TIME",
      size: "md",
    },
  ],
  [
    {
      id: "result",
      label: "Result",
      inputType: "RADIO",
      size: "xl",
      options: [
        { value: "Pass", label: "Pass" },
        { value: "Fail", label: "Fail" },
      ],
    },
  ],
  [
    {
      id: "inspectionFee",
      label: "Inspection Fee",
      inputType: "INPUT",
      size: "md",
    },

    {
      id: "uploadMeterInspectionReport",
      label: "Upload Meter Inspection Report ",
      inputType: "UPLOAD",
      size: "md",
    },
    {
      id: "nextInspectionDue",
      label: "Next Inspection Due",
      inputType: "CALENDAR",
      size: "md",
    },
  ],
  [
    {
      id: "uploadRateCard",
      label: "Upload Rate Card ",
      inputType: "UPLOAD",
      size: "md",
    },
    {
      id: "uploadInspectionReceipt",
      label: "Upload Inspection Receipt",
      inputType: "UPLOAD",
      size: "md",
    },
  ],
];

// export const vechileHackup1 = [
//   [
//     {
//       id: "tpep_provider",
//       label: "TSP Provider",
//       inputType: "SELECT",
//       options: [{ name: "CURB", code: "CURB" }],
//       isDisable: false,
//       size: "sm",
//     },
//     {
//       size: "md",
//       id: "configuration_type",
//       label: "Security Type",
//       inputType: "SELECT",
//       options: [
//         { name: "Camera", code: "Camera" },
//         { name: "Partition", code: "Partition" },
//       ],
//     },
//   ],
// ];

// {
//     id: "location_Meter",
//     label: "Delivery Location",
//     inputType: "SELECT",
//     options: [
//       { name: "Hudson Toyota", code: "Hudson Toyota" },
//       { name: "Hillside Toyota", code: "Hillside Toyota" },
//       { name: "Maaco", code: "Maaco" },
//       { name: "Metro Shop", code: "Metro Shop" },
//       { name: "Taxicab Products", code: "Taxicab Products" },
//       { name: "DMV", code: "DMV" },
//       { name: "TLC", code: "TLC" },
//     ],
//     size: "sm",
//     isRequire: true,
//   },

//   {
//     id: "location_Camera",
//     label: "Delivery Location",
//     inputType: "SELECT",
//     options: [
//       { name: "Hudson Toyota", code: "Hudson Toyota" },
//       { name: "Hillside Toyota", code: "Hillside Toyota" },
//       { name: "Maaco", code: "Maaco" },
//       { name: "Metro Shop", code: "Metro Shop" },
//       { name: "Taxicab Products", code: "Taxicab Products" },
//       { name: "DMV", code: "DMV" },
//       { name: "TLC", code: "TLC" },
//     ],
//     size: "sm",
//     isRequire: true,
//   },
//   {
//     id: "location_Rooftop",
//     label: "Delivery Location",
//     inputType: "SELECT",
//     options: [
//       { name: "Hudson Toyota", code: "Hudson Toyota" },
//       { name: "Hillside Toyota", code: "Hillside Toyota" },
//       { name: "Maaco", code: "Maaco" },
//       { name: "Metro Shop", code: "Metro Shop" },
//       { name: "Taxicab Products", code: "Taxicab Products" },
//       { name: "DMV", code: "DMV" },
//       { name: "TLC", code: "TLC" },
//     ],
//     size: "sm",
//     isRequire: true,
//   },

//   {
//     id: "location_Rooftop",
//     label: "Delivery Location",
//     inputType: "SELECT",
//     options: [
//       { name: "Hudson Toyota", code: "Hudson Toyota" },
//       { name: "Hillside Toyota", code: "Hillside Toyota" },
//       { name: "Maaco", code: "Maaco" },
//       { name: "Metro Shop", code: "Metro Shop" },
//       { name: "Taxicab Products", code: "Taxicab Products" },
//       { name: "DMV", code: "DMV" },
//       { name: "TLC", code: "TLC" },
//     ],
//     size: "sm",
//     isRequire: true,
//   },
//   {
//     id: "location_DMV registration",
//     label: "Delivery Location",
//     inputType: "SELECT",
//     options: [
//       { name: "Hudson Toyota", code: "Hudson Toyota" },
//       { name: "Hillside Toyota", code: "Hillside Toyota" },
//       { name: "Maaco", code: "Maaco" },
//       { name: "Metro Shop", code: "Metro Shop" },
//       { name: "Taxicab Products", code: "Taxicab Products" },
//       { name: "DMV", code: "DMV" },
//       { name: "TLC", code: "TLC" },
//     ],
//     size: "sm",
//     isRequire: true,
//   },

//   {
//     id: "location_TLC Inspection",
//     label: "Delivery Location",
//     inputType: "SELECT",
//     options: [
//       { name: "Hudson Toyota", code: "Hudson Toyota" },
//       { name: "Hillside Toyota", code: "Hillside Toyota" },
//       { name: "Maaco", code: "Maaco" },
//       { name: "Metro Shop", code: "Metro Shop" },
//       { name: "Taxicab Products", code: "Taxicab Products" },
//       { name: "DMV", code: "DMV" },
//       { name: "TLC", code: "TLC" },
//     ],
//     size: "sm",
//     isRequire: true,
//   },
//   {
//     id: "location_Dealership",
//     label: "Delivery Location",
//     inputType: "SELECT",
//     options: [
//       { name: "Hudson Toyota", code: "Hudson Toyota" },
//       { name: "Hillside Toyota", code: "Hillside Toyota" },
//       { name: "Maaco", code: "Maaco" },
//       { name: "Metro Shop", code: "Metro Shop" },
//       { name: "Taxicab Products", code: "Taxicab Products" },
//       { name: "DMV", code: "DMV" },
//       { name: "TLC", code: "TLC" },
//     ],
//     size: "sm",
//     isRequire: true,
//   },

//   {
//     id: "location_BAT Garage",
//     label: "Delivery Location",
//     inputType: "SELECT",
//     options: [
//       { name: "Hudson Toyota", code: "Hudson Toyota" },
//       { name: "Hillside Toyota", code: "Hillside Toyota" },
//       { name: "Maaco", code: "Maaco" },
//       { name: "Metro Shop", code: "Metro Shop" },
//       { name: "Taxicab Products", code: "Taxicab Products" },
//       { name: "DMV", code: "DMV" },
//       { name: "TLC", code: "TLC" },
//     ],
//     size: "sm",
//     isRequire: true,
//   },

export const vechileHackup2 = [
  // Paint
  {
    id: "location_Paint",
    label: "Delivery Location",
    inputType: "SELECT",
    options: [{ name: "Maaco", code: "Maaco" }],
    size: "sm",
    isRequire: false,
  },
  {
    id: "isSelected_Paint",
    label: "Select",
    options: [{ name: "Required", code: "isRequired" }, { name: "Not Required", code: "notRequired" }],
    inputType: "SELECT",
    size: "w-100-px",
  },
  {
    id: "droppedOff_Paint",
    label: "Dropped Off",
    inputType: "CHECK",
    size: "w-100-px",
  },
  {
    id: "droppedBy_Paint",
    label: "Dropped Off By",
    inputType: "SELECT",
    isRequire: false,
    options: [],
    size: "sm",
  },
  {
    id: "droppedOn_Paint",
    label: "Dropped Off On",
    inputType: "CALENDAR",
    isRequire: false,
    isCheck: false,
    size: "sm",
  },
  {
    id: "completed_Paint",
    label: "Completed",
    inputType: "CHECK",
    size: "w-100-px",
  },
  {
    id: "completedBy_Paint",
    label: "Completed By",
    inputType: "SELECT",
    isRequire: false,
    options: [],
    size: "sm",
  },
  {
    id: "completedOn_Paint",
    label: "Completed On",
    inputType: "CALENDAR",
    isRequire: false,
    isCheck: false,
    size: "sm",
  },

  // Meter
  {
    id: "location_Meter",
    label: "Delivery Location",
    inputType: "SELECT",
    options: [{ name: "Metro Shop", code: "Metro Shop" }],
    size: "sm",
    isRequire: false,
  },
  {
    id: "isSelected_Meter",
    label: "Select",
    options: [{ name: "Required", code: "isRequired" }, { name: "Not Required", code: "notRequired" }],
    inputType: "SELECT",
    size: "w-100-px",
  },
  {
    id: "droppedOff_Meter",
    label: "Dropped Off",
    inputType: "CHECK",
    size: "w-100-px",
  },
  {
    id: "droppedBy_Meter",
    label: "Dropped Off By",
    inputType: "SELECT",
    isRequire: false,
    options: [],
    size: "sm",
  },
  {
    id: "droppedOn_Meter",
    label: "Dropped Off On",
    inputType: "CALENDAR",
    isRequire: false,
    isCheck: false,
    size: "sm",
  },
  {
    id: "completed_Meter",
    label: "Completed",
    inputType: "CHECK",
    size: "w-100-px",
  },
  {
    id: "completedBy_Meter",
    label: "Completed By",
    inputType: "SELECT",
    isRequire: false,
    options: [
      { name: "Smith", code: "Smith" },
      { name: "Taylor", code: "Taylor" },
    ],
    size: "sm",
  },
  {
    id: "completedOn_Meter",
    label: "Completed On",
    inputType: "CALENDAR",
    isRequire: false,
    isCheck: false,
    size: "sm",
  },

  // Camera
  {
    id: "location_Camera",
    label: "Delivery Location",
    inputType: "SELECT",
    options: [{ name: "Taxicab Products", code: "Taxicab Products" }],
    size: "sm",
    isRequire: false,
  },
  {
    id: "isSelected_Camera",
    label: "Select",
    options: [{ name: "Required", code: "isRequired" }, { name: "Not Required", code: "notRequired" }],
    inputType: "SELECT",
    size: "w-100-px",
  },
  {
    id: "droppedOff_Camera",
    label: "Dropped Off",
    inputType: "CHECK",
    size: "w-100-px",
  },
  {
    id: "droppedBy_Camera",
    label: "Dropped Off By",
    inputType: "SELECT",
    isRequire: false,
    options: [
      { name: "Jaden", code: "Jaden" },
      { name: "Alex", code: "Alex" },
    ],
    size: "sm",
  },
  {
    id: "droppedOn_Camera",
    label: "Dropped Off On",
    inputType: "CALENDAR",
    isRequire: false,
    isCheck: false,
    size: "sm",
  },
  {
    id: "completed_Camera",
    label: "Completed",
    inputType: "CHECK",
    size: "w-100-px",
  },
  {
    id: "completedBy_Camera",
    label: "Completed By",
    inputType: "SELECT",
    isRequire: false,
    options: [
      { name: "Smith", code: "Smith" },
      { name: "Taylor", code: "Taylor" },
    ],
    size: "sm",
  },
  {
    id: "completedOn_Camera",
    label: "Completed On",
    inputType: "CALENDAR",
    isRequire: false,
    isCheck: false,
    size: "sm",
  },

  {
    id: "location_Rooftop",
    label: "Delivery Location",
    inputType: "SELECT",
    options: [
      { name: "Hudson Toyota", code: "Hudson Toyota" },
      { name: "Hillside Toyota", code: "Hillside Toyota" },
      { name: "Maaco", code: "Maaco" },
      { name: "Metro Shop", code: "Metro Shop" },
      { name: "Taxicab Products", code: "Taxicab Products" },
      { name: "DMV", code: "DMV" },
      { name: "TLC", code: "TLC" },
    ],
    size: "sm",
    isRequire: false,
  },
  {
    id: "isSelected_Rooftop",
    label: "Select",
    options: [{ name: "Required", code: "isRequired" }, { name: "Not Required", code: "notRequired" }],
    inputType: "SELECT",
    size: "w-100-px",
  },
  {
    id: "droppedOff_Rooftop",
    label: "Dropped Off",
    inputType: "CHECK",
    size: "w-100-px",
  },
  {
    id: "droppedBy_Rooftop",
    label: "Dropped Off By",
    inputType: "SELECT",
    isRequire: false,
    options: [],
    size: "sm",
  },
  {
    id: "droppedOn_Rooftop",
    label: "Dropped Off On",
    inputType: "CALENDAR",
    isRequire: false,
    size: "sm",
  },
  {
    id: "completed_Rooftop",
    label: "Completed",
    inputType: "CHECK",
    size: "w-100-px",
  },
  {
    id: "completedBy_Rooftop",
    label: "Completed By",
    inputType: "SELECT",
    isRequire: false,
    options: [],
    size: "sm",
  },
  {
    id: "completedOn_Rooftop",
    label: "Completed On",
    inputType: "CALENDAR",
    isRequire: false,
    size: "sm",
  },
  {
    id: "location_DMV",
    label: "Delivery Location",
    inputType: "SELECT",
    options: [{ name: "DMV", code: "DMV" }],
    size: "sm",
    isRequire: false,
  },
  {
    id: "isSelected_DMV",
    label: "Select",
    options: [{ name: "Required", code: "isRequired" }, { name: "Not Required", code: "notRequired" }],
    inputType: "SELECT",
    size: "w-100-px",
  },
  {
    id: "droppedOff_DMV",
    label: "Dropped Off",
    inputType: "CHECK",
    size: "w-100-px",
  },
  {
    id: "droppedBy_DMV",
    label: "Dropped Off By",
    inputType: "SELECT",
    options: [],
    size: "sm",
    isRequire: false,
  },
  {
    id: "droppedOn_DMV",
    label: "Dropped Off On",
    inputType: "CALENDAR",
    size: "sm",
    isRequire: false,
  },
  {
    id: "completed_DMV",
    label: "Completed",
    inputType: "CHECK",
    size: "w-100-px",
  },
  {
    id: "completedBy_DMV",
    label: "Completed By",
    inputType: "SELECT",
    options: [],
    size: "sm",
    isRequire: false,
  },
  {
    id: "completedOn_DMV",
    label: "Completed On",
    inputType: "CALENDAR",
    size: "sm",
    isRequire: false,
  },

  {
    id: "location_TLC",
    label: "Delivery Location",
    inputType: "SELECT",
    options: [{ name: "TLC", code: "TLC" }],
    size: "sm",
    isRequire: false,
  },
  {
    id: "isSelected_TLC",
    label: "Select",
    options: [{ name: "Required", code: "isRequired" }, { name: "Not Required", code: "notRequired" }],
    inputType: "SELECT",
    size: "w-100-px",
  },
  {
    id: "droppedOff_TLC",
    label: "Dropped Off",
    inputType: "CHECK",
    size: "w-100-px",
  },
  {
    id: "droppedBy_TLC",
    label: "Dropped Off By",
    inputType: "SELECT",
    options: [],
    size: "sm",
    isRequire: false,
  },
  {
    id: "droppedOn_TLC",
    label: "Dropped Off On",
    inputType: "CALENDAR",
    size: "sm",
    isRequire: false,
  },
  {
    id: "completed_TLC",
    label: "Completed",
    inputType: "CHECK",
    size: "w-100-px",
  },
  {
    id: "completedBy_TLC",
    label: "Completed By",
    inputType: "SELECT",
    options: [],
    size: "sm",
    isRequire: false,
  },
  {
    id: "completedOn_TLC",
    label: "Completed On",
    inputType: "CALENDAR",
    size: "sm",
    isRequire: false,
  },

  {
    id: "location_Dealership",
    label: "Delivery Location",
    inputType: "SELECT",
    options: [
      { name: "Hudson Toyota", code: "Hudson Toyota" },
      { name: "Hillside Toyota", code: "Hillside Toyota" },
    ],
    size: "sm",
    isRequire: false,
  },
  {
    id: "isSelected_Dealership",
    label: "Select",
    options: [{ name: "Required", code: "isRequired" }, { name: "Not Required", code: "notRequired" }],
    inputType: "SELECT",
    size: "w-100-px",
  },
  {
    id: "droppedOff_Dealership",
    label: "Dropped Off",
    inputType: "CHECK",
    size: "w-100-px",
  },
  {
    id: "droppedBy_Dealership",
    label: "Dropped Off By",
    inputType: "SELECT",
    options: [],
    size: "sm",
    isRequire: false,
  },
  {
    id: "droppedOn_Dealership",
    label: "Dropped Off On",
    inputType: "CALENDAR",
    size: "sm",
    isRequire: false,
  },
  {
    id: "completed_Dealership",
    label: "Completed",
    inputType: "CHECK",
    size: "w-100-px",
  },
  {
    id: "completedBy_Dealership",
    label: "Completed By",
    inputType: "SELECT",
    options: [],
    size: "sm",
    isRequire: false,
  },
  {
    id: "completedOn_Dealership",
    label: "Completed On",
    inputType: "CALENDAR",
    size: "sm",
    isRequire: false,
  },

  {
    id: "location_BATGarage",
    label: "Delivery Location",
    inputType: "SELECT",
    options: [{ name: "BAT Garage", code: "BAT Garage" }],
    size: "sm",
    isRequire: false,
  },
  {
    id: "isSelected_BATGarage",
    label: "Select",
    options: [{ name: "Required", code: "isRequired" }, { name: "Not Required", code: "notRequired" }],
    inputType: "SELECT",
    size: "w-100-px",
  },
  {
    id: "droppedOff_BATGarage",
    label: "Dropped Off",
    inputType: "CHECK",
    size: "w-100-px",
  },
  {
    id: "droppedBy_BATGarage",
    label: "Dropped Off By",
    inputType: "SELECT",
    options: [],
    size: "sm",
    isRequire: false,
  },
  {
    id: "droppedOn_BATGarage",
    label: "Dropped Off On",
    inputType: "CALENDAR",
    size: "sm",
    isRequire: false,
  },
  {
    id: "completed_BATGarage",
    label: "Completed",
    inputType: "CHECK",
    size: "w-100-px",
  },
  {
    id: "completedBy_BATGarage",
    label: "Completed By",
    inputType: "SELECT",
    options: [],
    size: "sm",
    isRequire: false,
  },
  {
    id: "completedOn_BATGarage",
    label: "Completed On",
    inputType: "CALENDAR",
    size: "sm",
    isRequire: false,
  },

  {
    id: "notes_Paint",
    label: "Notes",
    inputType: "INPUT",
    placeholder: "Enter notes here...",
    size: "sm",
  },
  {
    id: "notes_Meter",
    label: "Notes",
    inputType: "INPUT",
    placeholder: "Enter notes here...",
    size: "sm",
  },
  {
    id: "notes_Camera",
    label: "Notes",
    inputType: "INPUT",
    placeholder: "Enter notes here...",
    size: "sm",
  },
  {
    id: "notes_Rooftop",
    label: "Notes",
    inputType: "INPUT",
    placeholder: "Enter notes here...",
    size: "sm",
  },
  {
    id: "notes_DMV",
    label: "Notes",
    inputType: "INPUT",
    placeholder: "Enter notes here...",
    size: "sm",
  },
  {
    id: "notes_TLC",
    label: "Notes",
    inputType: "INPUT",
    placeholder: "Enter notes here...",
    size: "sm",
  },
  {
    id: "notes_Dealership",
    label: "Notes",
    inputType: "INPUT",
    placeholder: "Enter notes here...",
    size: "sm",
  },
  {
    id: "notes_BATGarage",
    label: "Notes",
    inputType: "INPUT",
    placeholder: "Enter notes here...",
    size: "sm",
  },
];

export const addtionHackUpDetails = [
  {
    id: "plate_number",
    label: "Plate Number",
    isRequire: true,
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "meter_serial_no",
    label: "Meter Serial No",
    isRequire: true,
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "insurance_number",
    label: "Insurance number",
    isRequire: true,
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "insurance_start_date",
    label: "Insurance Start Date",
    inputType: "CALENDAR",
    isCheck: false,
    size: "sm",
    isRequire: true,
  },
  {
    id: "insurance_end_date",
    label: "Insurance End Date",
    inputType: "CALENDAR",
    isCheck: false,
    size: "sm",
    isRequire: true,
  },
];

export const vechileHackup1 = [
  [
    {
      id: "tpep_provider",
      label: "TSP Provider",
      inputType: "SELECT",
      options: [{ name: "Crub", code: "crub" }],
      isDisable: false,
      isRequire: true,
      size: "sm",
    },
    {
      id: "configuration_type",
      label: "Security Type",
      inputType: "SELECT",
      options: [
        { name: "Camera", code: "Camera" },
        { name: "Partition", code: "Partition" },
      ],
      size: "md",
      isRequire: true,
    },
  ],
  [
    {
      id: "paint",
      label: "Paint",
      inputType: "CHECK",
      size: "w-100-px",
    },
    {
      id: "paintCompletedDate",
      label: "Paint Completed Date",
      inputType: "CALENDAR",
      isCheck: false,
      size: "sm",
      isRequire: true,
    },
  ],
  [
    {
      id: "camera",
      label: "Camera",
      inputType: "CHECK",
      size: "w-100-px",
    },
    {
      id: "cameraType",
      label: "Camera Type",
      inputType: "SELECT",
      isRequire: true,
      options: [
        { name: "Rearview Camera", code: "Rearview Camera" },
        { name: "Side Camera", code: "Side Camera" },
        { name: "Front Camera", code: "Front Camera" },
        { name: "360-degree Camera", code: "360-degree Camera" },
        { name: "Dash Camera", code: "Dash Camera" },
        { name: "Night Vision Camera", code: "Night Vision Camera" },
        { name: "Parking Camera", code: "Parking Camera" },
      ],
      size: "sm",
    },
    {
      id: "cameraInstalledDate",
      label: "Camera Installed Date",
      inputType: "CALENDAR",
      isRequire: true,
      isCheck: false,
      size: "sm",
    },
  ],
  [
    {
      id: "partition",
      label: "partition",
      inputType: "CHECK",
      size: "w-100-px",
    },
    {
      id: "partitionType",
      label: "Partition Type",
      inputType: "SELECT",
      isRequire: true,
      options: [
        { name: "Rearview Camera", code: "Rearview Camera" },
        { name: "Side Camera", code: "Side Camera" },
        { name: "Front Camera", code: "Front Camera" },
        { name: "360-degree Camera", code: "360-degree Camera" },
        { name: "Dash Camera", code: "Dash Camera" },
        { name: "Night Vision Camera", code: "Night Vision Camera" },
        { name: "Parking Camera", code: "Parking Camera" },
      ],
      size: "sm",
    },
    {
      id: "partitionInstalledDate",
      label: "Partition Installed Date",
      inputType: "CALENDAR",
      isCheck: false,
      isRequire: true,
      size: "sm",
    },
  ],
  [
    {
      id: "meter",
      label: "Meter",
      inputType: "CHECK",
      size: "w-100-px",
    },
    {
      id: "meterType",
      label: "Meter Type",
      inputType: "SELECT",
      isRequire: true,
      options: [
        { name: "Fuel Meter", code: "Fuel Meter" },
        { name: "Speedometer", code: "Speedometer" },
        { name: "Odometer", code: "Odometer" },
        { name: "Tachometer", code: "Tachometer" },
        { name: "Battery Meter", code: "Battery Meter" },
        { name: "Energy Consumption Meter", code: "Energy Consumption Meter" },
        { name: "Temperature Meter", code: "Temperature Meter" },
        { name: "Trip Meter", code: "Trip Meter" },
      ],
      size: "sm",
    },
    {
      id: "meterInstalledDate",
      label: "Meter Installed Date",
      inputType: "CALENDAR",
      isCheck: false,
      isRequire: true,
      size: "sm",
    },
    {
      id: "meterSerialNo",
      label: "Meter Serial No",
      isRequire: true,
      inputType: "INPUT",
      size: "sm",
    },
  ],
  [
    {
      id: "rooftop",
      label: "Rooftop",
      inputType: "CHECK",
      size: "w-100-px",
    },
    {
      id: "roofTopType",
      label: "Roof Top Type",
      inputType: "SELECT",
      isRequire: true,
      options: [
        { name: "Sunroof", code: "Sunroof" },
        { name: "Moonroof", code: "Moonroof" },
        { name: "Convertible", code: "Convertible" },
        { name: "Hardtop", code: "Hardtop" },
      ],
      size: "sm",
    },
    {
      id: "roofTopInstalledDate",
      label: "Roof Top Installed Date",
      inputType: "CALENDAR",
      isRequire: true,
      isCheck: false,
      size: "sm",
    },
  ],
];

export const vehicleSearch = [
  {
    id: "vimNumber",
    label: "VIN Number",
    inputType: "INPUT",
    size: "sm",
  },
  // {
  //   id: "vehicleType",
  //   label: "Vehicle Type",
  //   inputType: "INPUT",
  //   size: "sm",
  // },
  {
    id: "vehicleType",
    label: "Vehicle Type",
    inputType: "SELECT",
    size: "sm",
  },
  {
    id: "brand",
    label: "Brand",
    inputType: "INPUT",
    size: "sm",
  },
];

export const medallionSearch = [
  {
    id: "medallionNumber",
    label: "Medallion No",
    inputType: "INPUT",
    size: "sm",
  },
];

// export const leaseFinancialDetails = {
//   dov: [
//     {
//       category: "Management Recommendation",
//       id: "management_recommendation",
//       amount: {
//         editable: true,
//       },
//     },
//     {
//       category: "MED Lease as per TLC Rule 58-12 (Article 15)",
//       id: "med_lease",
//       max: 994,
//       amount: {
//         editable: true,
//       },
//     },
//     {
//       category: "TLC Maximum Amount",
//       id: "med_tlc_maximum_amount",
//       value: "994.00",
//       amount: {
//         editable: false,
//       },
//     },
//     {
//       category: "VEH Lease as per TLC rule 58-21 (4)",
//       id: "veh_lease",
//       max: 275,
//       amount: {
//         editable: true,
//       },
//     },
//     {
//       category: "TLC Maximum Amount",
//       id: "veh_tlc_maximum_amount",
//       value: "275.00",
//       amount: {
//         editable: false,
//       },
//     },
//     {
//       category: "Lease Amount",
//       id: "lease_amount",
//       amount: {
//         editable: false,
//       },
//     },
//   ],
//   ["long-term"]: [
//     {
//       category: "Management Recommendation",
//       id: "long_term_management_recommendation",
//       amount: {
//         editable: true,
//       },
//     },
//     {
//       category: "Day Shift",
//       id: "day_shift",
//       max: 994,
//       amount: {
//         editable: true,
//       },
//     },
//     {
//       category: "TLC Maximum Amount",
//       id: "day_tlc_maximum_amount",
//       value: "994.00",
//       amount: {
//         editable: false,
//       },
//     },
//     {
//       category: "Night Shift",
//       id: "night_shift",
//       max: 275,
//       amount: {
//         editable: true,
//       },
//     },
//     {
//       category: "TLC Maximum Amount",
//       id: "night_tlc_maximum_amount",
//       value: "275.00",
//       amount: {
//         editable: false,
//       },
//     },
//     {
//       category: "Lease Amount",
//       id: "long_term_lease_amount",
//       amount: {
//         editable: false,
//       },
//     },
//   ],
//   ["medallion-only"]: [
//     {
//       category: "Weekly Lease Rate",
//       id: "weekly_lease_rate",
//       max: "994.00",
//       amount: {
//         editable: true,
//       },
//     },
//     {
//       category: "TLC Maximum Amount",
//       id: "week_tlc_maximum_amount",
//       value: "994.00",
//       amount: {
//         editable: false,
//       },
//     },
//   ],
//   ["short-term"]: [
//     {
//       category: "1 Week or Longer",
//       id: "1_week_or_longer",
//       amount: {
//         editable: true,
//         field: [
//           {
//             id: "longer_day_shift",
//             max: 630,
//           },
//           {
//             id: "longer_night_shift",
//             max: 737,
//           },
//         ],
//       },
//     },
//     {
//       category: "TLC Maximum Amount",
//       id: "1_week_or_longer_tlc_maximum_amount",
//       amount: {
//         editable: false,
//         field: [
//           {
//             id: "longer_day_shift_tlc_maximum_amount",
//             value: 630,
//           },
//           {
//             id: "longer_night_shift_tlc_maximum_amount",
//             value: 737,
//           },
//         ],
//       },
//     },
//     // {
//     //     category: 'Day of the Week',
//     //     id: "day_of_week",
//     //     multiple: true,
//     //     key: "dayOfWeek",
//     //     option: ["12-Hour Day Shifts", "12-Hour Night Shifts"],
//     //     amount: {
//     //         editable: false,
//     //     },
//     // },
//     // {
//     //     category: 'sun',
//     //     amount: {
//     //         editable: true,
//     //     },
//     // },
//     // {
//     //     category: 'TLC Maximum Amount',
//     //     amount: {
//     //         editable: false,
//     //     },
//     // },
//   ],
// };

// export const leaseFinancialDetails = {
//   dov: [
//     {
//       category: "Lease Amount",
//       id: "lease_amount",
//       amount: {
//         editable: false,
//       },
//     },
//   ],
//   ["long-term"]: [
//     {
//       category: "Management Recommendation",
//       id: "long_term_management_recommendation",
//       amount: {
//         editable: true,
//       },
//     },
//     {
//       category: "Day Shift",
//       id: "day_shift",
//       max: 994,
//       amount: {
//         editable: true,
//       },
//     },
//     {
//       category: "TLC Maximum Amount",
//       id: "day_tlc_maximum_amount",
//       value: "994.00",
//       amount: {
//         editable: false,
//       },
//     },
//     {
//       category: "Night Shift",
//       id: "night_shift",
//       max: 275,
//       amount: {
//         editable: true,
//       },
//     },
//     {
//       category: "TLC Maximum Amount",
//       id: "night_tlc_maximum_amount",
//       value: "275.00",
//       amount: {
//         editable: false,
//       },
//     },
//     {
//       category: "Lease Amount",
//       id: "long_term_lease_amount",
//       amount: {
//         editable: false,
//       },
//     },
//   ],
//   ["medallion-only"]: [
//     {
//       category: "Weekly Lease Rate",
//       id: "weekly_lease_rate",
//       max: "994.00",
//       amount: {
//         editable: true,
//       },
//     },
//     {
//       category: "TLC Maximum Amount",
//       id: "week_tlc_maximum_amount",
//       value: "994.00",
//       amount: {
//         editable: false,
//       },
//     },
//   ],
//   ["short-term"]: [
//     {
//       category: "1 Week or Longer",
//       id: "1_week_or_longer",
//       amount: {
//         editable: true,
//         field: [
//           {
//             id: "longer_day_shift",
//             max: 630,
//           },
//           {
//             id: "longer_night_shift",
//             max: 737,
//           },
//         ],
//       },
//     },
//     {
//       category: "TLC Maximum Amount",
//       id: "1_week_or_longer_tlc_maximum_amount",
//       amount: {
//         editable: false,
//         field: [
//           {
//             id: "longer_day_shift_tlc_maximum_amount",
//             value: 630,
//           },
//           {
//             id: "longer_night_shift_tlc_maximum_amount",
//             value: 737,
//           },
//         ],
//       },
//     },
//   ],
// };

export const leaseFinancialDetails = {
  dov: [
    {
      category: "Total Lease Amount",
      id: "total_lease_amt",
      amount: {
        editable: true,
      },
    },
    {
      category: "Vehicle Lease Payment",
      id: "vehicle_lease",
      max: 994,
      amount: {
        editable: false,
      },
    },
    {
      category: "Sales Tax",
      id: "sales_tax",
      value: "994.00",
      amount: {
        editable: false,
      },
    },
    {
      category: "Total Vehicle Lease Payment",
      id: "total_vehicle_lease_amount",
      amount: {
        editable: false,
      },
    },
    {
      category: "Registration",
      id: "registration",
      amount: {
        editable: false,
      },
    },
    {
      category: "TLC Inspection Fees",
      id: "tlc_inspection_fee",
      max: 275,
      amount: {
        editable: false,
      },
    },
    {
      category: "Tax Stamps",
      id: "tax_stamps",
      value: "275.00",
      amount: {
        editable: false,
      },
    },
    {
      category: "Medallion Lease Payment",
      id: "medallion_lease_payment",
      amount: {
        editable: false,
      },
    },
    {
      category: "Total Medallions Lease Payment",
      id: "total_medallion_lease_payment",
      amount: {
        editable: false,
      },
    },
    {
      category: "Additional Balance Due",
      id: "additional_bal_due",
      amount: {
        editable: false,
      },
    },
    {
      category: "Security Deposit",
      id: "security_deposit",
      amount: {
        editable: true,
      },
    },
    {
      category: "Cancellation Charge",
      id: "cancellation_charge",
      amount: {
        editable: true,
      },
    },
    // {
    //   category: "TLC Medallion Lease Cap",
    //   id: "tlc_medallion_lease_cap",
    //   amount: {
    //     editable: false,
    //   },
    // },
  ],
  ["long-term"]: [
    {
      category: "Total Lease Amount",
      id: "total_lease_amt",
      amount: {
        editable: true,
      },
    },
    // {
    //   category: "Vehicle Lease Payment",
    //   id: "vehicle_lease",
    //   max: 994,
    //   amount: {
    //     editable: false,
    //   },
    // },
    // {
    //   category: "Sales Tax",
    //   id: "sales_tax",
    //   value: "994.00",
    //   amount: {
    //     editable: false,
    //   },
    // },
    // {
    //   category: "Total Vehicle Lease Payment",
    //   id: "total_vehicle_lease_amount",
    //   amount: {
    //     editable: false,
    //   },
    // },
    {
      category: "Registration",
      id: "registration",
      amount: {
        editable: false,
      },
    },
    {
      category: "TLC Inspection Fees",
      id: "tlc_inspection_fee",
      max: 275,
      amount: {
        editable: false,
      },
    },
    {
      category: "Tax Stamps",
      id: "tax_stamps",
      value: "275.00",
      amount: {
        editable: false,
      },
    },
    {
      category: "Medallion Lease Payment",
      id: "medallion_lease_payment",
      amount: {
        editable: false,
      },
    },
    {
      category: "Total Medallions Lease Payment",
      id: "total_medallion_lease_payment",
      amount: {
        editable: false,
      },
    },
    {
      category: "Additional Balance Due",
      id: "additional_bal_due",
      amount: {
        editable: false,
      },
    },
    {
      category: "Security Deposit",
      id: "security_deposit",
      amount: {
        editable: true,
      },
    },
    {
      category: "Cancellation Charge",
      id: "cancellation_charge",
      amount: {
        editable: true,
      },
    },
  ],
  ["medallion-only"]: [
    {
      category: "Total Lease Amount",
      id: "total_lease_amt",
      amount: {
        editable: true,
      },
    },
    // {
    //   category: "Vehicle Lease Payment",
    //   id: "vehicle_lease",
    //   max: 994,
    //   amount: {
    //     editable: false,
    //   },
    // },
    // {
    //   category: "Sales Tax",
    //   id: "sales_tax",
    //   value: "994.00",
    //   amount: {
    //     editable: false,
    //   },
    // },
    // {
    //   category: "Total Vehicle Lease Payment",
    //   id: "total_vehicle_lease_amount",
    //   amount: {
    //     editable: false,
    //   },
    // },
    {
      category: "Registration",
      id: "registration",
      amount: {
        editable: false,
      },
    },
    {
      category: "TLC Inspection Fees",
      id: "tlc_inspection_fee",
      max: 275,
      amount: {
        editable: false,
      },
    },
    {
      category: "Tax Stamps",
      id: "tax_stamps",
      value: "275.00",
      amount: {
        editable: false,
      },
    },
    {
      category: "Medallion Lease Payment",
      id: "medallion_lease_payment",
      amount: {
        editable: false,
      },
    },
    {
      category: "Total Medallions Lease Payment",
      id: "total_medallion_lease_payment",
      amount: {
        editable: false,
      },
    },
    {
      category: "Additional Balance Due",
      id: "additional_bal_due",
      amount: {
        editable: false,
      },
    },
    {
      category: "Security Deposit",
      id: "security_deposit",
      amount: {
        editable: true,
      },
    },
    {
      category: "Cancellation Charge",
      id: "cancellation_charge",
      amount: {
        editable: true,
      },
    },
  ],
  ["shift-lease"]: [
    {
      category: "Total Lease Amount",
      id: "total_lease_amt",
      amount: {
        editable: true,
      },
    },
    // {
    //   category: "Vehicle Lease Payment",
    //   id: "vehicle_lease",
    //   max: 994,
    //   amount: {
    //     editable: false,
    //   },
    // },
    // {
    //   category: "Sales Tax",
    //   id: "sales_tax",
    //   value: "994.00",
    //   amount: {
    //     editable: false,
    //   },
    // },
    // {
    //   category: "Total Vehicle Lease Payment",
    //   id: "total_vehicle_lease_amount",
    //   amount: {
    //     editable: false,
    //   },
    // },
    {
      category: "Registration",
      id: "registration",
      amount: {
        editable: false,
      },
    },
    {
      category: "TLC Inspection Fees",
      id: "tlc_inspection_fee",
      max: 275,
      amount: {
        editable: false,
      },
    },
    {
      category: "Tax Stamps",
      id: "tax_stamps",
      value: "275.00",
      amount: {
        editable: false,
      },
    },
    {
      category: "Medallion Lease Payment",
      id: "medallion_lease_payment",
      amount: {
        editable: false,
      },
    },
    {
      category: "Total Medallions Lease Payment",
      id: "total_medallion_lease_payment",
      amount: {
        editable: false,
      },
    },
    {
      category: "Additional Balance Due",
      id: "additional_bal_due",
      amount: {
        editable: false,
      },
    },
    {
      category: "Security Deposit",
      id: "security_deposit",
      amount: {
        editable: true,
      },
    },
    {
      category: "Cancellation Charge",
      id: "cancellation_charge",
      amount: {
        editable: true,
      },
    },
  ],
};

export const leaseRemark = [
  {
    id: "remark",
    label: "Remark",
    inputType: "INPUT",
    size: "sm",
  },
];

export const notificationLeaseExpriy = [
  [
    {
      id: "textMessage",
      label: "Text Message",
      inputType: "SWITCH",
      size: "sm",
    },
    {
      id: "email",
      label: "Email",
      inputType: "SWITCH",
      size: "sm",
    },
    {
      id: "notifications",
      label: "Notifications",
      inputType: "SWITCH",
      size: "sm",
    },
  ],
  [
    {
      id: "user",
      label: "BATM User",
      inputType: "RADIO",
      size: "sm",
      options: [
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" },
      ],
    },
    {
      id: "medallionOwner",
      label: "Medallion Owner",
      inputType: "SELECT",
      options: [],
      filter: true,
      size: "sm",
    },
    {
      id: "daysInAdvance",
      label: "Days in Advance",
      inputType: "SELECT",
      options: [
        { name: "1", code: "1" },
        { name: "2", code: "2" },
        { name: "3", code: "3" },
        { name: "4", code: "4" },
        { name: "5", code: "5" },
        { name: "6", code: "6" },
        { name: "7", code: "7" },
        { name: "8", code: "8" },
        { name: "9", code: "9" },
        { name: "10", code: "10" },
      ],
      size: "sm",
    },
  ],
];

export const medallionRenewal = [
  [
    {
      id: "medallionRenewalTextMessage",
      label: "Text Message",
      inputType: "SWITCH",
      size: "sm",
    },
    {
      id: "medallionRenewalEmail",
      label: "Email",
      inputType: "SWITCH",
      size: "sm",
    },
    {
      id: "medallionRenewalNotifications",
      label: "Notifications",
      inputType: "SWITCH",
      size: "sm",
    },
  ],
  [
    {
      id: "medallionRenewalUser",
      label: "BATM User",
      inputType: "RADIO",
      size: "sm",
      options: [
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" },
      ],
    },
    {
      id: "medallionRenewalMedallionOwner",
      label: "Medallion Owner",
      inputType: "SELECT",
      filter: true,
      options: [],
      size: "sm",
    },
    {
      id: "medallionRenewalDaysInAdvance",
      label: "Days in Advance",
      inputType: "SELECT",
      options: [
        { name: "1", code: "1" },
        { name: "2", code: "2" },
        { name: "3", code: "3" },
        { name: "4", code: "4" },
        { name: "5", code: "5" },
        { name: "6", code: "6" },
        { name: "7", code: "7" },
        { name: "8", code: "8" },
        { name: "9", code: "9" },
        { name: "10", code: "10" },
      ],
      size: "sm",
    },
  ],
];
export const driverLeaseExpiry = [
  [
    {
      id: "driverLeaseTextMessage",
      label: "Text Message",
      inputType: "SWITCH",
      size: "sm",
    },
    {
      id: "driverLeaseEmail",
      label: "Email",
      inputType: "SWITCH",
      size: "sm",
    },
    {
      id: "driverLeaseNotifications",
      label: "Notifications",
      inputType: "SWITCH",
      size: "sm",
    },
  ],
  [
    {
      id: "driverLeaseUser",
      label: "BATM User",
      inputType: "RADIO",
      size: "sm",
      options: [
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" },
      ],
    },
    {
      id: "driverLeaseMedallionOwner",
      label: "Select Driver",
      inputType: "SELECT",
      filter: true,
      options: [],
      size: "sm",
    },
    {
      id: "driverLeaseDaysInAdvance",
      label: "Days in Advance",
      inputType: "SELECT",
      options: [
        { name: "1", code: "1" },
        { name: "2", code: "2" },
        { name: "3", code: "3" },
        { name: "4", code: "4" },
        { name: "5", code: "5" },
        { name: "6", code: "6" },
        { name: "7", code: "7" },
        { name: "8", code: "8" },
        { name: "9", code: "9" },
        { name: "10", code: "10" },
      ],
      size: "sm",
    },
  ],
];
export const tlcLicenseExpiry = [
  [
    {
      id: "tlcTextMessage",
      label: "Text Message",
      inputType: "SWITCH",
      size: "sm",
    },
    {
      id: "tlcEmail",
      label: "Email",
      inputType: "SWITCH",
      size: "sm",
    },
    {
      id: "tlcNotifications",
      label: "Notifications",
      inputType: "SWITCH",
      size: "sm",
    },
  ],
  [
    {
      id: "tlcUser",
      label: "BATM User",
      inputType: "RADIO",
      size: "sm",
      options: [
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" },
      ],
    },
    {
      id: "tlcMedallionOwner",
      label: "Select Driver",
      inputType: "SELECT",
      filter: true,
      options: [],
      size: "sm",
    },
    {
      id: "tlcDaysInAdvance",
      label: "Days in Advance",
      inputType: "SELECT",
      options: [
        { name: "1", code: "1" },
        { name: "2", code: "2" },
        { name: "3", code: "3" },
        { name: "4", code: "4" },
        { name: "5", code: "5" },
        { name: "6", code: "6" },
        { name: "7", code: "7" },
        { name: "8", code: "8" },
        { name: "9", code: "9" },
        { name: "10", code: "10" },
      ],
      size: "sm",
    },
  ],
];
export const dmvLicenseExpiry = [
  [
    {
      id: "dmvTextMessage",
      label: "Text Message",
      inputType: "SWITCH",
      size: "sm",
    },
    {
      id: "dmvEmail",
      label: "Email",
      inputType: "SWITCH",
      size: "sm",
    },
    {
      id: "dmvNotifications",
      label: "Notifications",
      inputType: "SWITCH",
      size: "sm",
    },
  ],
  [
    {
      id: "dmvUser",
      label: "BATM User",
      inputType: "RADIO",
      size: "sm",
      options: [
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" },
      ],
    },
    {
      id: "dmvMedallionOwner",
      label: "Select Driver",
      inputType: "SELECT",
      filter: true,
      options: [],
      size: "sm",
    },
    {
      id: "dmvDaysInAdvance",
      label: "Days in Advance",
      inputType: "SELECT",
      options: [
        { name: "1", code: "1" },
        { name: "2", code: "2" },
        { name: "3", code: "3" },
        { name: "4", code: "4" },
        { name: "5", code: "5" },
        { name: "6", code: "6" },
        { name: "7", code: "7" },
        { name: "8", code: "8" },
        { name: "9", code: "9" },
        { name: "10", code: "10" },
      ],
      size: "sm",
    },
  ],
];
export const vehicleRegistration = [
  [
    {
      id: "vehicleTextMessage",
      label: "Text Message",
      inputType: "SWITCH",
      size: "sm",
    },
    {
      id: "vehicleEmail",
      label: "Email",
      inputType: "SWITCH",
      size: "sm",
    },
    {
      id: "vehicleNotifications",
      label: "Notifications",
      inputType: "SWITCH",
      size: "sm",
    },
  ],
  [
    {
      id: "vehicleUser",
      label: "BATM User",
      inputType: "RADIO",
      size: "sm",
      options: [
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" },
      ],
    },
    {
      id: "vehicleMedallionOwner",
      label: "Select Driver",
      inputType: "SELECT",
      filter: true,
      options: [],
      size: "sm",
    },
    {
      id: "vehicledaysInAdvance",
      label: "Days in Advance",
      inputType: "SELECT",
      options: [
        { name: "1", code: "1" },
        { name: "2", code: "2" },
        { name: "3", code: "3" },
        { name: "4", code: "4" },
        { name: "5", code: "5" },
        { name: "6", code: "6" },
        { name: "7", code: "7" },
        { name: "8", code: "8" },
        { name: "9", code: "9" },
        { name: "10", code: "10" },
      ],
      size: "sm",
    },
  ],
];

export const personalInfo = {
  field_01: {
    id: "userName",
    label: "User Name",
    inputType: "SWITCH",
    size: "sm",
  },
  field_02: {
    id: "middleName",
    label: "Middle Name",
    inputType: "SWITCH",
    size: "sm",
  },
  field_03: {
    id: "lastName",
    label: "Last Name",
    inputType: "SWITCH",
    size: "sm",
  },
  field_04: {
    id: "contactNo",
    label: "Contact No",
    inputType: "SWITCH",
    size: "sm",
  },
  field_05: {
    id: "mailID",
    label: "Mail ID",
    inputType: "SWITCH",
    size: "sm",
  },
  field_06: {
    id: "dob",
    label: "D.O.B",
    inputType: "SWITCH",
    size: "sm",
  },
  field_07: {
    id: "password",
    label: "Password",
    inputType: "SWITCH",
    size: "sm",
  },
  field_08: {
    id: "accountActivate",
    label: "Account Activate",
    inputType: "SWITCH",
    size: "sm",
    options: [
      { label: "Yes", value: true, id: "yesId" },
      { label: "No", value: false, id: "noId" },
    ],
  },
  field_09: {
    id: "chooseType",
    label: "Choose Type",
    inputType: "SWITCH",
    size: "sm",
    options: [
      { name: "Internal", code: "Wav" },
      { name: "External", code: "Regular" },
    ],
  },
  field_10: {
    id: "chooseRole",
    label: "Choose Role",
    inputType: "SWITCH",
    size: "sm",
    options: [
      { name: "WAV", code: "Wav" },
      { name: "Regular", code: "Regular" },
    ],
  },
};

export const vehicleRepairDeatil = {
  field_01: {
    id: "invoice_date",
    label: "Invoice Date",
    isRequire: true,
  },
  field_02: {
    id: "vehicle_in_date",
    label: "Vehicle In Date",
    isRequire: true,
  },
  field_03: {
    id: "vehicle_in_time",
    label: "Vehicle In Time",
  },
  field_04: {
    id: "vehicle_out_date",
    label: "Vehicle Out Date",
    isRequire: true,
  },
  field_05: {
    id: "vehicle_out_time",
    label: "Vehicle Out Time",
  },
  field_06: {
    id: "repair_paid_by",
    label: "Repair Paid By",
    isRequire: true,
    value: "BAT",
    options: [
      { label: "BAT", value: "BAT", id: "yesId" },
      { label: "Driver", value: "Driver", id: "noId" },
    ],
  },
  field_07: {
    id: "invoice_amount",
    label: "Invoice Amount",
  },
  field_08: {
    id: "uploadInvoice",
    label: "Upload Invoice",
  },
  field_09: {
    id: "remarks",
    label: "Remarks",
  },
  field_10: {
    id: "next_service_due_by",
    label: "Next Service Due By",
  },
};

export const reHackUp = {
  field_01: {
    id: "searchMedallion",
    label: "Search Medallion",
    isRequire: true,
    filter: true,
    options: [],
  },
  field_02: {
    id: "typeYourReason",
    label: "Type your reason",
  },
};

export const pvbCreateDriver = {
  field_01: {
    id: "medallion_number",
    label: "Medallion No",
  },
  field_02: {
    id: "tlc_license_number",
    label: "TLC License No",
  },
  field_03: {
    id: "plate_number",
    label: "Vehicle Plate No",
  },
};

export const enterPvbDetail = [
  {
    id: "tlcLicenseNumber",
    label: "Vehicle Plate",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "dmvLicenseNumber",
    label: "State",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "ssn",
    label: "Type",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "ssn",
    label: "Terminated",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "ssn",
    label: "Summon",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "ssn",
    label: "Non Program",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "ssn",
    label: "Issue Date",
    inputType: "CALENDAR",
    size: "sm",
  },
  {
    id: "ssn",
    label: "Issue Time",
    inputType: "TIME",
    size: "sm",
  },
  {
    id: "ssn",
    label: "System Entry",
    inputType: "CALENDAR",
    size: "sm",
  },
  {
    id: "ssn",
    label: "New Issue",
    inputType: "RADIO",
    size: "sm",
    value: "Yes",
    options: [
      { value: "Yes", label: "Yes" },
      { value: "No", label: "No" },
    ],
  },
  {
    id: "ssn",
    label: "VC",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "ssn",
    label: "Hearing",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "ssn",
    label: "Penalty Warning",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "ssn",
    label: "Judgement",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "ssn",
    label: "Fine",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "ssn",
    label: "Penalty",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "ssn",
    label: "Interest",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "ssn",
    label: "Reduction",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "ssn",
    label: "Payment",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "ssn",
    label: "NG PMT",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "ssn",
    label: "Amount",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "ssn",
    label: "VIO County",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "ssn",
    label: "Font OR OPP",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "ssn",
    label: "House No",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "ssn",
    label: "Street Name",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "ssn",
    label: "Intersect Street",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "ssn",
    label: "GEO Location",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "ssn",
    label: "Street Code 1",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "ssn",
    label: "Street Code 2",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "ssn",
    label: "Street Code 3",
    inputType: "INPUT",
    size: "sm",
  },
];

export const searchDriverForPayment = {
  field_01: {
    id: "driver_id",
    label: "Driver ID",
  },
  field_02: {
    id: "tlc_no",
    label: "TLC License No",
  },
  field_03: {
    id: "plate_no",
    label: "Vehicle Plate No",
  },
};

export const enterReciptDetail = [
  {
    category: "MTA",
    due: "0.00",
    cash: "0",
    dtr: "0",
    balance: "0.00",
    remarks: "",
  },
  {
    category: "TIF",
    due: "0.00",
    cash: "0",
    dtr: "0",
    balance: "0.00",
    remarks: "",
  },
  {
    category: "CPF",
    due: "0.00",
    cash: "0",
    dtr: "0",
    balance: "0.00",
    remarks: "",
  },
  {
    category: "AAF",
    due: "0.00",
    cash: "0",
    dtr: "0",
    balance: "0.00",
    remarks: "",
  },
  {
    category: "TLC",
    due: "0.00",
    cash: "0",
    dtr: "0",
    balance: "0.00",
    remarks: "",
  },
  {
    category: "PVB",
    due: "0.00",
    cash: "0",
    dtr: "0",
    balance: "0.00",
    remarks: "",
  },
  {
    category: "EZPASS",
    due: "0.00",
    cash: "0",
    dtr: "0",
    balance: "0.00",
    remarks: "",
  },
  {
    category: "Fee",
    due: "0.00",
    cash: "0",
    dtr: "0",
    balance: "0.00",
    remarks: "",
  },
  {
    category: "Adjustments",
    due: "0.00",
    cash: "0",
    dtr: "0",
    balance: "0.00",
    remarks: "",
  },
  {
    category: "Total",
    due: "0.00",
    cash: "0",
    dtr: "0",
    balance: "0.00",
    remarks: "",
  },
];

export const choosePayPeriod = {
  // field_01: {
  //     id: "pay_day",
  //     label: "Pay Day",
  //     isRequire: true,
  //     multiple: false,
  //     options: [
  //         { name: "S", code: "sun" },
  //         { name: "M", code: "mon" },
  //         { name: "T", code: "tus" },
  //         { name: "W", code: "wen" },
  //         { name: "R", code: "thu" },
  //         { name: "F", code: "fri" },
  //         { name: "S", code: "sat" }
  //     ]
  // },
  field_02: {
    id: "startDate",
    label: "Start Date",
    isRequire: true,
    type: "date",
  },
  field_04: {
    id: "startTime",
    label: "Start Time",
    isRequire: true,
    type: "time",
  },
  field_03: {
    id: "endDate",
    label: "End Date",
    isRequire: true,
    type: "date",
  },
  field_05: {
    id: "endTime",
    label: "End Time",
    isRequire: true,
    type: "time",
  },
  field_06: {
    id: "driverId",
    label: "Driver ID",
    isRequire: false,
    type: "text",
  },
  field_07: {
    id: "include_all_drivers",
    value: true,
    options: [{ value: false, label: "Choose All Drivers" }],
  },
  // field_07: {
  //     id: "medallionNumber",
  //     label: "Medallion Number",
  //     isRequire: false,
  //     type: "checkbox"
  // },
  // field_08: {
  //     id: "vehiclePlate",
  //     label: "Vehicle Plate",
  //     isRequire: false,
  //     type: "checkbox"
  // }
};

export const leaseConfig = {
  dov: [
    {
      category: "Weekly Lease Rate",
      id: "management_recommendation",
      type: "MED Lease",
      amount: {
        editable: true,
      },
    },
    {
      category: "MED Lease as per TLC Rule 58-12 (Article 15)",
      id: "med_lease",
      max: 994,
      amount: {
        editable: true,
      },
    },
    {
      category: "TLC Maximum Amount",
      id: "med_tlc_maximum_amount",
      value: "994.00",
      amount: {
        editable: false,
      },
    },
    {
      category: "VEH Lease as per TLC rule 58-21 (4)",
      id: "veh_lease",
      max: 275,
      amount: {
        editable: true,
      },
    },
    {
      category: "TLC Maximum Amount",
      id: "veh_tlc_maximum_amount",
      value: "275.00",
      amount: {
        editable: false,
      },
    },
    {
      category: "Lease Amount",
      id: "lease_amount",
      amount: {
        editable: false,
      },
    },
  ],
  ["long-term"]: [
    {
      category: "Management Recommendation",
      id: "long_term_management_recommendation",
      amount: {
        editable: true,
      },
    },
    {
      category: "Day Shift",
      id: "day_shift",
      max: 994,
      amount: {
        editable: true,
      },
    },
    {
      category: "TLC Maximum Amount",
      id: "day_tlc_maximum_amount",
      value: "994.00",
      amount: {
        editable: false,
      },
    },
    {
      category: "Night Shift",
      id: "night_shift",
      max: 275,
      amount: {
        editable: true,
      },
    },
    {
      category: "TLC Maximum Amount",
      id: "night_tlc_maximum_amount",
      value: "275.00",
      amount: {
        editable: false,
      },
    },
    {
      category: "Lease Amount",
      id: "long_term_lease_amount",
      amount: {
        editable: false,
      },
    },
  ],
  ["medallion-only"]: [
    {
      category: "Weekly Lease Rate",
      id: "weekly_lease_rate",
      max: "994.00",
      amount: {
        editable: true,
      },
    },
    {
      category: "TLC Maximum Amount",
      id: "week_tlc_maximum_amount",
      value: "994.00",
      amount: {
        editable: false,
      },
    },
  ],
  ["short-term"]: [
    {
      category: "1 Week or Longer",
      id: "1_week_or_longer",
      amount: {
        editable: true,
        field: [
          {
            id: "longer_day_shift",
            max: 630,
          },
          {
            id: "longer_night_shift",
            max: 737,
          },
        ],
      },
    },
    {
      category: "TLC Maximum Amount",
      id: "1_week_or_longer_tlc_maximum_amount",
      amount: {
        editable: false,
        field: [
          {
            id: "longer_day_shift_tlc_maximum_amount",
            value: 630,
          },
          {
            id: "longer_night_shift_tlc_maximum_amount",
            value: 737,
          },
        ],
      },
    },
    {
      category: "Day of the Week",
      id: "day_of_week",
      multiple: true,
      key: "dayOfWeek",
      option: ["12-Hour Day Shifts", "12-Hour Night Shifts"],
      amount: {
        editable: false,
      },
    },
    // {
    //     category: 'sun',
    //     amount: {
    //         editable: true,
    //     },
    // },
    // {
    //     category: 'TLC Maximum Amount',
    //     amount: {
    //         editable: false,
    //     },
    // },
  ],
};

export const ledgerEnterDriver = [
  {
    id: "amount",
    label: "Amount",
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "transactionType",
    label: "Dr/Cr",
    inputType: "RADIO",
    value: "credit",
    options: [
      { label: "Pay To Driver", value: true },
      { label: "Pay To Big Apple", value: false },
    ],
    size: "xl",
    isRequire: true,
  },
  {
    id: "sourceType",
    label: "Transaction Type",
    options: ["Ezpass", "pvb", "CURB"],
    inputType: "INPUT",
    size: "sm",
    isRequire: true,
  },
  {
    id: "sourceId",
    label: "Source Id",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "ledgerInvoice",
    label: "Upload Document",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "enterDescription",
    label: "Enter Description",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "transactionTime",
    label: "Transaction Time",
    isRequire: true,
    isDisable: false,
  },
  {
    id: "transactionDate",
    label: "Transaction Date",
    isRequire: true,
    isDisable: false,
    maxDate: new Date(),
  },
];

export const ledgerSearchDriver = [
  {
    id: "medallion_number",
    label: "Medallion Number",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "driver_id",
    label: "Driver ID",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "driver_name",
    label: "Driver Name",
    inputType: "INPUT",
    size: "sm",
  },
  {
    id: "vin",
    label: "VIN",
    inputType: "INPUT",
    size: "sm",
  },
];
export const manageLedgerEntry = {
  field_01: {
    id: "currentUser",
    label: "Current User",
  },
  field_02: {
    id: "reassignTo",
    label: "Reassign To",
    options: [
      { name: "John snow", code: "John snow" },
      { name: "Aklema", code: "Aklema" },
    ],
  },
  field_03: {
    id: "driver_id",
    label: "Driver ID",
  },
  field_04: {
    id: "medallion_number",
    label: "Medallion No",
  },
  field_05: {
    id: "vin",
    label: "VIN No",
  },
  field_06: {
    id: "amount",
    label: "Amount",
  },
  field_07: {
    id: "transaction_type",
    label: "Transaction Type",
  },
  field_08: {
    id: "source_type",
    label: "Source Type",
  },
  field_09: {
    id: "source_id",
    label: "Source ID",
  },
  field_10: {
    id: "created_on",
    label: "Ledger Date",
  },
  field_11: {
    id: "description",
    label: "Description",
  },
};

export const manageDriverPayment = {
  field_01: {
    id: "medallion_number",
    label: "Medallion No",
  },
  field_02: {
    id: "tlc_license_number",
    label: "TLC License No",
  },
  field_03: {
    id: "plate_number",
    label: "Vehicle Plate No",
  },
};
