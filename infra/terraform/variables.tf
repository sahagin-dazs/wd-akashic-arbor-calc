variable "prefix" {
  description = "Lowercase letters/numbers used to prefix resource names (must keep storage/Cosmos naming rules in mind)."
  type        = string
  default     = "wdtools"

  validation {
    condition     = can(regex("^[a-z0-9]{3,18}$", var.prefix))
    error_message = "prefix must be 3-18 characters of lowercase letters/numbers (to keep storage/Cosmos names in range)."
  }
}

variable "location" {
  description = "Azure region for most resources."
  type        = string
  default     = "eastus2"
}

variable "static_site_location" {
  description = "Azure region for Static Web App (must be one of: westus2, centralus, eastus2, westeurope, eastasia)."
  type        = string
  default     = "eastus2"
}

variable "enable_free_tier" {
  description = "Whether to request the Cosmos DB free tier (one account per subscription)."
  type        = bool
  default     = true
}
