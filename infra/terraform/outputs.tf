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

output "function_app_name" {
  value       = azurerm_windows_function_app.api.name
  description = "Azure Functions app name for the tier list API."
}

output "function_app_default_hostname" {
  value       = azurerm_windows_function_app.api.default_hostname
  description = "Default hostname for the Azure Functions app."
}
