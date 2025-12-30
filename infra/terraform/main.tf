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
  storage_account_name  = "${local.prefix}funcsa"
  function_app_name     = "${local.prefix}-api"
  tags = {
    project = "akashic-arbor"
  }
}

resource "azurerm_resource_group" "rg" {
  name     = "${local.prefix}-rg"
  location = var.location
  tags     = local.tags
}

resource "azurerm_storage_account" "func_sa" {
  name                     = local.storage_account_name
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
  tags                     = local.tags
}

resource "azurerm_service_plan" "func_plan" {
  name                = "${local.prefix}-func-plan"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  os_type             = "Windows"
  sku_name            = "B1"
  tags                = local.tags
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
  ip_range_filter               = ["0.0.0.0"]

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

resource "azurerm_windows_function_app" "api" {
  name                       = local.function_app_name
  resource_group_name        = azurerm_resource_group.rg.name
  location                   = azurerm_resource_group.rg.location
  service_plan_id            = azurerm_service_plan.func_plan.id
  storage_account_name       = azurerm_storage_account.func_sa.name
  storage_account_access_key = azurerm_storage_account.func_sa.primary_access_key
  https_only                 = true
  tags                       = local.tags

  site_config {
    cors {
      allowed_origins = [
        "https://wdtoolbox.com",
        "https://www.wdtoolbox.com"
      ]
    }
    application_stack {
      node_version = "~18"
    }
  }

  app_settings = merge(
    {
      AzureWebJobsStorage      = azurerm_storage_account.func_sa.primary_connection_string
      FUNCTIONS_WORKER_RUNTIME = "node"
      SCM_DO_BUILD_DURING_DEPLOYMENT = "1"
      ENABLE_ORYX_BUILD              = "true"
      COSMOSDB_ENDPOINT        = azurerm_cosmosdb_account.cosmos.endpoint
      COSMOSDB_KEY             = sensitive(azurerm_cosmosdb_account.cosmos.primary_key)
      COSMOSDB_DB              = azurerm_cosmosdb_sql_database.db.name
      COSMOSDB_CONTAINER       = azurerm_cosmosdb_sql_container.lists.name
    },
    var.application_insights_connection_string != ""
    ? {
        APPLICATIONINSIGHTS_CONNECTION_STRING = var.application_insights_connection_string
      }
    : {}
  )
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
  repository_token    = "1"
}
