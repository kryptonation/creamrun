# {
#   "$schema": "http://json-schema.org/draft-07/schema#",
#   "title": "Create Driver Loan Details",
#   "description": "Schema for validating the manual creation of a driver loan.",
#   "type": "object",
#   "properties": {
#     "driver_id": {
#       "description": "The primary key of the selected driver from the 'drivers' table.",
#       "type": "integer"
#     },
#     "lease_id": {
#       "description": "The primary key of the selected active lease from the 'leases' table.",
#       "type": "integer"
#     },
#     "vehicle_id": {
#       "description": "The primary key of the associated vehicle.",
#       "type": "integer"
#     },
#     "medallion_id": {
#       "description": "The primary key of the associated medallion.",
#       "type": "integer"
#     },
#     "loan_amount": {
#       "description": "The total principal amount of the loan.",
#       "type": "number",
#       "exclusiveMinimum": 0
#     },
#     "interest_rate": {
#       "description": "The annual interest rate for the loan (e.g., 10 for 10%). Defaults to 0.",
#       "type": "number",
#       "minimum": 0,
#       "maximum": 100
#     },
#     "start_week": {
#       "description": "The Sunday date when the repayment schedule should begin.",
#       "type": "string",
#       "format": "date"
#     },
#     "notes": {
#       "description": "Optional notes or purpose for the loan.",
#       "type": ["string", "null"]
#     }
#   },
#   "required": [
#     "driver_id",
#     "lease_id",
#     "vehicle_id",
#     "medallion_id",
#     "loan_amount",
#     "start_week"
#   ],
#   "additionalProperties": false
# }