output "resource_group" {
  value       = azurerm_resource_group.rg.name
  description = "Resource group for all Azure resources."
}

output "static_site_default_hostname" {
  value       = azurerm_static_web_app.web.default_host_name
  description = "Default hostname for the Azure Static Web App."
}

output "cosmosdb_endpoint" {
  value       = azurerm_cosmosdb_account.cosmos.endpoint
  description = "Cosmos DB endpoint."
}
