export const maskSSN = (ssn) => {
  if (!ssn || typeof ssn !== "string") return "";

  const parts = ssn.split("-");
  if (
    parts.length === 3 &&
    parts[0].length === 3 &&
    parts[1].length === 2 &&
    parts[2].length === 4
  ) {
    return `XXX-XX-${parts[2]}`;
  }

  return ssn;
};

export const getFullName = (firstName, middleName, lastName) => {
  return [firstName, middleName, lastName]
    .filter((name) => name && name.trim() !== "")
    .join(" ");
};

export function kbToMb(kb) {
  let mb = kb / 1024;
  if (mb < 1) {
    return `${Math.round(kb)} KB`;
  } else {
    let roundedMb = Math.round(mb);
    return `${roundedMb} MB`;
  }
}

export const formatAddress = (details) => {
  if (!details) return "";

  const {
    address_line_1 = "",
    address_line_2 = "",
    city = "",
    zip = "",
    latitude = "",
    longitude = "",
  } = details;

  const address = [address_line_1, address_line_2, city, zip]
    .filter((part) => part?.trim() !== "")
    .join(", ");

  const coordinates =
    latitude && longitude
      ? `${latitude} | ${longitude}`
      : latitude || longitude;

  return { address, coordinates };
};

export const filterSelectGenerate = (data) => {
  if (!data) {
    return [];
  }
  return data?.map((item) => {
    return { value: item, label: item };
  });
};

export const filterSelectGenerateLeaseTable = (data) => {
  if (!data) {
    return [];
  }
  return data?.map((item) => {
    return { value: item, label: removeHypenBetweenWords(item) };
  });
};
// export const removeUnderScore = (data) => {
//   if (!data) {
//     return "";
//   }
//   return data?.replace(/_/g, " ");
// };

export const removeUnderScore = (data) => {
  if (!data) {
    return "";
  }

  // First, replace underscores with spaces
  let result = data.replace(/_/g, " ");

  // Define acronym mappings
  const acronymMappings = {
    ssn: "SSN",
    dmv: "DMV",
    tlc: "TLC",
    ein: "EIN",
    ss4: "SS4",
  };

  // Replace each acronym (case-insensitive)
  Object.entries(acronymMappings).forEach(([key, value]) => {
    // Create regex to match the acronym as a whole word (not part of another word)
    const regex = new RegExp(`\\b${key}\\b`, "gi");
    result = result.replace(regex, value);
  });

  return result;
};

export const removeUnderScorefilterGenerate = (data) => {
  if (!data) {
    return [];
  }
  return data?.map((item) => {
    if (!item) return;
    return { value: item, label: removeUnderScore(item) };
  });
};

export const capitalizeWords = (str) => {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Enhanced validation with multiple checks
export const validateEmailAdvanced = (email) => {
  // Basic format check
  const basicPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // More comprehensive pattern
  const detailedPattern =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  return basicPattern.test(email) && detailedPattern.test(email);
};

export const removeHypenBetweenWords = (str) => {
  if (!str) return ""; // handle null, undefined, or empty string

  return str
    .split("-")
    .map((word) => {
      if (word.toLowerCase() === "dov") {
        return "DOV"; // Fully capitalize 'dov'
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
};


const taxiValidators = [
  /^Y\d{6}C$/i,          // Y123456C (medallion plate)
  /^S\d{6}V$/i,          // S123456V (standby)
  /^\d{5}-TY$/i,         // 12345-TY (older taxi plate)
];

export const isValidTaxiIdentifier = (input) => {
  if (!input || typeof input !== 'string') return false;
  const normalized = input.trim().toUpperCase();
  return taxiValidators.some(rx => rx.test(normalized));
}