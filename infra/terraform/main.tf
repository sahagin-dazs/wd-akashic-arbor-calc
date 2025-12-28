terraform {
  required_version = ">= 1.5"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.1"
    }
  }
}

provider "azurerm" {
  features {}
}

locals {
  # Use validated prefix directly (lowercase letters/numbers) for global name requirements.
  prefix                = lower(var.prefix)
  cosmos_account_name   = "${local.prefix}cosmos"
  tags = {
    project = "akashic-arbor"
  }
}

resource "azurerm_resource_group" "rg" {
  name     = "${local.prefix}-rg"
  location = var.location
  tags     = local.tags
}

resource "azurerm_cosmosdb_account" "cosmos" {
  name                = local.cosmos_account_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"
  free_tier_enabled   = var.enable_free_tier
  automatic_failover_enabled = false
  analytical_storage_enabled  = false
  public_network_access_enabled = true

  consistency_policy {
    consistency_level = "Session"
  }

  capabilities {
    name = "EnableServerless"
  }

  geo_location {
    location          = azurerm_resource_group.rg.location
    failover_priority = 0
  }

  tags = local.tags
}

resource "azurerm_cosmosdb_sql_database" "db" {
  name                = "appdata"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmos.name
}

resource "azurerm_cosmosdb_sql_container" "lists" {
  name                = "items"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmos.name
  database_name       = azurerm_cosmosdb_sql_database.db.name
  partition_key_paths = ["/id"]
}

resource "azurerm_static_web_app" "web" {
  name                = "${local.prefix}-swa"
  resource_group_name = azurerm_resource_group.rg.name
  location            = var.static_site_location
  sku_tier            = "Free"
  sku_size            = "Free"
  tags                = local.tags
  repository_branch   = "main"
  repository_url      = "https://github.com/sahagin-dazs/wd-akashic-arbor-calc"
}
