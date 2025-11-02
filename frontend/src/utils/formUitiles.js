import * as Yup from "yup";
import { statesOptions } from "./variables";

export const buildYupValidationSchema = (schema) => {
  let yupSchema = {};

  Object.entries(schema.properties).forEach(([fieldName, fieldSchema]) => {
    let fieldValidator;

    switch (fieldSchema.type) {
      case "string":
        fieldValidator = Yup.string();
        if (fieldSchema.format === "email") {
          fieldValidator = fieldValidator.email("Invalid email address");
        }
        if (fieldSchema.minLength) {
          fieldValidator = fieldValidator.min(
            fieldSchema.minLength,
            `Must be at least ${fieldSchema.minLength} characters`
          );
        }
        if (fieldSchema.maxLength) {
          fieldValidator = fieldValidator.max(
            fieldSchema.maxLength,
            `Must be ${fieldSchema.maxLength} characters or less`
          );
        }
        break;

      case "integer":
      case "number":
        fieldValidator = Yup.number();
        if (fieldSchema.minimum) {
          fieldValidator = fieldValidator.min(
            fieldSchema.minimum,
            `Must be at least ${fieldSchema.minimum}`
          );
        }
        if (fieldSchema.maximum) {
          fieldValidator = fieldValidator.max(
            fieldSchema.maximum,
            `Must be ${fieldSchema.maximum} or less`
          );
        }
        break;

      case "boolean":
        fieldValidator = Yup.boolean();
        break;

      case "array":
        if (fieldSchema.items && fieldSchema.items.enum) {
          fieldValidator = Yup.array().of(
            Yup.string().oneOf(fieldSchema.items.enum)
          );
        } else {
          fieldValidator = Yup.array();
        }
        break;

      default:
        fieldValidator = Yup.mixed();
    }

    if (schema.required && schema.required.includes(fieldName)) {
      fieldValidator = fieldValidator.required("This field is required");
    }

    yupSchema[fieldName] = fieldValidator;
  });

  return Yup.object().shape(yupSchema);
};

export function dataURItoBlob(dataURI) {
  const [header, base64] = dataURI.split(",", 2);
  const mimeType = header.split(":")[1].split(";")[0];
  const byteString = atob(base64);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }
  return new Blob([arrayBuffer], { type: mimeType });
}

export const validateUSZipCode = (
  zipCode,
  allowZipPlus4 = true,
  strictFormatting = false
) => {
  // Check if zipCode is provided
  if (!zipCode || typeof zipCode !== "string") {
    return {
      isValid: false,
      message: "Zip code is required",
      format: null,
    };
  }

  // Remove whitespace
  const cleanZip = zipCode.trim();

  // Regular expressions for different zip code formats
  const zipPatterns = {
    // 5-digit zip code (12345)
    basic: /^\d{5}$/,
    // ZIP+4 format (12345-6789)
    zipPlus4: /^\d{5}-\d{4}$/,
    // ZIP+4 without hyphen (123456789)
    zipPlus4NoHyphen: /^\d{9}$/,
  };

  // Check basic 5-digit format
  if (zipPatterns.basic.test(cleanZip)) {
    return {
      isValid: true,
      message: "Valid 5-digit zip code",
      format: "basic",
    };
  }

  // Check ZIP+4 formats if allowed
  if (allowZipPlus4) {
    // ZIP+4 with hyphen
    if (zipPatterns.zipPlus4.test(cleanZip)) {
      return {
        isValid: true,
        message: "Valid ZIP+4 format",
        format: "zipPlus4",
      };
    }

    // ZIP+4 without hyphen (if strict formatting is not required)
    if (!strictFormatting && zipPatterns.zipPlus4NoHyphen.test(cleanZip)) {
      return {
        isValid: true,
        message: "Valid 9-digit zip code (ZIP+4 without hyphen)",
        format: "zipPlus4NoHyphen",
      };
    }
  }

  // Generate appropriate error message
  let errorMessage = "Invalid zip code format. ";
  if (allowZipPlus4) {
    errorMessage += strictFormatting
      ? "Expected format: 12345 or 12345-6789"
      : "Expected format: 12345, 12345-6789, or 123456789";
  } else {
    errorMessage += "Expected format: 12345";
  }

  return {
    isValid: false,
    message: errorMessage,
    format: null,
  };
};

export const validateBankName = (bankName) => {
  // Check if bank name is required
  if (!bankName) {
    return "Bank Name is required";
  }

  // Check minimum length
  if (bankName.trim().length < 2) {
    return "Bank Name must be at least 2 characters long";
  }

  // Check for valid characters (letters, numbers, spaces, and common punctuation)
  if (!/^[A-Za-z0-9\s\.\-&,'"()]+$/.test(bankName)) {
    return "Bank Name contains invalid characters";
  }

  // Check for leading or trailing spaces
  if (/^\s|\s$/.test(bankName)) {
    return "Bank Name cannot start or end with spaces";
  }

  // If all validations pass, return null (no error)
  return null;
};

export const validateDMVLicenseNumber = (dmvLicenseNumber) => {
  // Check if DMV License Number is required
  if (!dmvLicenseNumber) {
    return "DMV License Number is required";
  }

  const trimmedValue = dmvLicenseNumber.trim();

  // Check if trimmed value is empty
  if (!trimmedValue) {
    return "DMV License Number cannot be empty";
  }

  // Check for leading or trailing spaces in original value
  if (/^\s|\s$/.test(dmvLicenseNumber)) {
    return "DMV License Number cannot start or end with spaces";
  }

  // Check for consecutive spaces
  if (/\s{2,}/.test(trimmedValue)) {
    return "DMV License Number cannot contain consecutive spaces";
  }

  if (/^0+$/.test(trimmedValue)) {
    return "DMV License Number cannot be all zeros";
  }

  // Check basic pattern (5-17 characters, letters, numbers, and spaces)
  if (!/^[A-Z0-9\s]{5,17}$/i.test(trimmedValue)) {
    return "DMV License Number must be 5-17 characters and contain only letters, numbers, and spaces";
  }

  // Check length without spaces to ensure actual content is within range
  const withoutSpaces = trimmedValue.replace(/\s/g, "");
  if (withoutSpaces.length < 5 || withoutSpaces.length > 15) {
    return "DMV License Number must contain 5-15 characters (excluding spaces)";
  }

  // If all validations pass, return null (no error)
  return null;
};

export const validateDrivingLicenseNumber = (dmvLicenseNumber) => {
  // Check if DMV License Number is required
  if (!dmvLicenseNumber) {
    return "Driving License Number is required";
  }

  const trimmedValue = dmvLicenseNumber.trim();

  // Check if trimmed value is empty
  if (!trimmedValue) {
    return "Driving License Number cannot be empty";
  }

  // Check for leading or trailing spaces in original value
  if (/^\s|\s$/.test(dmvLicenseNumber)) {
    return "Driving License Number cannot start or end with spaces";
  }

  // Check for consecutive spaces
  if (/\s{2,}/.test(trimmedValue)) {
    return "Driving License Number cannot contain consecutive spaces";
  }

  if (/^0+$/.test(trimmedValue)) {
    return "Driving License Number cannot be all zeros";
  }

  // Check basic pattern (5-17 characters, letters, numbers, and spaces)
  if (!/^[A-Z0-9\s]{5,17}$/i.test(trimmedValue)) {
    return "Driving License Number must be 5-17 characters and contain only letters, numbers, and spaces";
  }

  // Check length without spaces to ensure actual content is within range
  const withoutSpaces = trimmedValue.replace(/\s/g, "");
  if (withoutSpaces.length < 5 || withoutSpaces.length > 15) {
    return "Driving License Number must contain 5-15 characters (excluding spaces)";
  }

  // If all validations pass, return null (no error)
  return null;
};

export const validateTlcLicenseNumber = (value) => {
  if (!value) {
    return "TLC License Number is required";
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "TLC License Number cannot be empty";
  }

  if (!/^[0-9]{6,8}$/.test(trimmedValue)) {
    return "TLC License Number must be exactly 6 to 7 digits";
  }

  if (/^0+$/.test(trimmedValue)) {
    return "TLC License Number cannot be all zeros";
  }

  return null;
};

export const validateNameField = (value, fieldLabel = "Name") => {
  if (!value) {
    return `${fieldLabel} is required`;
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length < 1) {
    return `${fieldLabel} cannot be empty`;
  }

  if (!/^[A-Za-z\s\-'\.]+$/.test(trimmedValue)) {
    return `${fieldLabel} contains invalid characters`;
  }

  if (trimmedValue.length > 50) {
    return `${fieldLabel} cannot exceed 50 characters`;
  }

  if (/^\s|\s$/.test(value)) {
    return `${fieldLabel} cannot start or end with spaces`;
  }

  return null;
};

export const validateOptionalNameField = (value, fieldLabel = "Name") => {
  if (!value) {
    return null; // ✅ No error since it's optional
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length < 1) {
    return `${fieldLabel} cannot be empty`;
  }

  if (!/^[A-Za-z\s\-'\.]+$/.test(trimmedValue)) {
    return `${fieldLabel} contains invalid characters`;
  }

  if (trimmedValue.length > 50) {
    return `${fieldLabel} cannot exceed 50 characters`;
  }

  if (/^\s|\s$/.test(value)) {
    return `${fieldLabel} cannot start or end with spaces`;
  }

  return null; // ✅ No error
};

export const getStateNameFromCode = (stateCode) => {
  const state = statesOptions.find((state) => state.code === stateCode);
  return state ? state.name : stateCode;
};

export const validatePassportNumber = (passport) => {
  const trimmed = passport.trim();

  // Only letters (A–Z) and digits allowed, length 6–9
  const passportRegex = /^[A-ZA-Z0-9]{6,9}$/;

  if (!passportRegex.test(trimmed)) {
    return "Passport Number must be 6-9 characters and contain only letters and numbers";
  }

  return ""; // no error
};

export const validateRoutingNumber = (routingNumber) => {
  const errors = [];

  // Trim leading/trailing spaces
  const value = routingNumber?.trim() || "";

  const digitRegex = /^\d+$/;

  if (!value) {
    errors.push("Routing Number is required");
  } else if (!digitRegex.test(value)) {
    errors.push("Routing Number must contain only digits");
  } else if (/^\s|\s$/.test(routingNumber)) {
    errors.push("Routing Number cannot start or end with spaces");
  } else if (value.length < 5 || value.length > 10) {
    errors.push("Routing Number must be between 5 and 10 digits");
  } else if (/^0+$/.test(value)) {
    errors.push("Routing Number cannot be all zeros");
  }

  return errors.length > 0 ? errors.join(", ") : null;
};

export const validateBankAccountNumber = (accountNumber) => {
  const errors = [];
  const rawValue = accountNumber != null ? String(accountNumber) : ""; // keep original for space check
  const value = rawValue.trim();
  const digitRegex = /^\d+$/;

  if (!value) {
    errors.push("Bank Account Number is required");
  } else if (/^\s|\s$/.test(rawValue)) {
    errors.push("Bank Account Number cannot start or end with spaces");
  } else if (!digitRegex.test(value)) {
    errors.push("Bank Account Number must contain only digits");
  } else if (value.length < 6 || value.length > 18) {
    errors.push("Bank Account Number must be between 6 and 18 digits");
  } else if (/^0+$/.test(value)) {
    errors.push("Bank Account Number cannot be all zeros");
  }

  return errors.length > 0 ? errors.join(", ") : null;
};
