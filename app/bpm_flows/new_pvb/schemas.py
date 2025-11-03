# {
#   "$schema": "http://json-schema.org/draft-07/schema#",
#   "title": "Choose Driver for PVB Violation",
#   "description": "Schema for validating the selected driver/lease context for a new PVB violation.",
#   "type": "object",
#   "properties": {
#     "driver_pk_id": {
#       "description": "The primary key (ID) of the selected driver from the 'drivers' table.",
#       "type": "integer"
#     },
#     "vehicle_id": {
#       "description": "The primary key (ID) of the associated vehicle from the 'vehicles' table.",
#       "type": "integer"
#     },
#     "medallion_id": {
#       "description": "The primary key (ID) of the associated medallion from the 'medallions' table.",
#       "type": "integer"
#     },
#     "lease_id": {
#       "description": "The primary key (ID) of the active lease from the 'leases' table.",
#       "type": "integer"
#     },
#     "vehicle_plate_no": {
#         "description": "The plate number of the associated vehicle.",
#         "type": "string"
#     }
#   },
#   "required": [
#     "driver_pk_id",
#     "vehicle_id",
#     "medallion_id",
#     "lease_id",
#     "vehicle_plate_no"
#   ],
#   "additionalProperties": true
# }


# {
#   "$schema": "http://json-schema.org/draft-07/schema#",
#   "title": "PVB Violation Details",
#   "description": "Schema for validating the details of a manually entered PVB violation.",
#   "type": "object",
#   "properties": {
#     "plate": {
#       "description": "The license plate number of the vehicle.",
#       "type": "string",
#       "minLength": 1,
#       "maxLength": 50
#     },
#     "state": {
#       "description": "The state of the license plate (e.g., 'NY').",
#       "type": "string",
#       "minLength": 2,
#       "maxLength": 10
#     },
#     "type": {
#       "description": "The type code of the violation (e.g., 'OMT', 'PAS').",
#       "type": "string",
#       "minLength": 1,
#       "maxLength": 50
#     },
#     "summons": {
#       "description": "The unique summons number from the ticket.",
#       "type": "string",
#       "minLength": 1,
#       "maxLength": 255
#     },
#     "issue_date": {
#       "description": "The date the violation was issued.",
#       "type": "string",
#       "format": "date"
#     },
#     "issue_time": {
#       "description": "The time the violation was issued in HHMM(A/P) format (e.g., '0550P').",
#       "type": ["string", "null"],
#       "pattern": "^(0[1-9]|1[0-2])[0-5][0-9][AP]$"
#     },
#     "fine": {
#       "description": "The base fine amount of the violation.",
#       "type": "number",
#       "exclusiveMinimum": 0
#     },
#     "penalty": {
#       "description": "Any additional penalty amount.",
#       "type": "number",
#       "minimum": 0
#     },
#     "interest": {
#       "description": "Any interest amount accrued.",
#       "type": "number",
#       "minimum": 0
#     },
#     "reduction": {
#       "description": "Any reduction applied to the amount due.",
#       "type": "number",
#       "minimum": 0
#     }
#   },
#   "required": [
#     "plate",
#     "state",
#     "type",
#     "summons",
#     "issue_date",
#     "fine"
#   ],
#   "additionalProperties": true
# }


# {
#   "$schema": "http://json-schema.org/draft-07/schema#",
#   "title": "Attach Proof for PVB Violation",
#   "description": "Schema for validating the attachment of a proof document to a PVB violation.",
#   "type": "object",
#   "properties": {
#     "document_id": {
#       "description": "The primary key (ID) of the uploaded document from the 'document' table.",
#       "type": "integer",
#       "minimum": 1
#     }
#   },
#   "required": [
#     "document_id"
#   ],
#   "additionalProperties": false
# }