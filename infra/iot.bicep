targetScope = 'resourceGroup'

@description('Name of the IoT Hub')
param iotHubName string

@description('Location for the IoT Hub')
param location string = resourceGroup().location

@description('Tags for the IoT Hub')
param tags object = {}

@description('IoT Hub SKU')
@allowed(['F1', 'S1', 'S2', 'S3'])
param skuName string = 'S1'

@description('Number of IoT Hub units')
param skuCapacity int = 1

@description('Principal ID for RBAC role assignment (IoT Hub Data Contributor)')
param principalId string = ''

resource iotHub 'Microsoft.Devices/IotHubs@2023-06-30' = {
  name: iotHubName
  location: location
  tags: tags
  sku: {
    name: skuName
    capacity: skuCapacity
  }
  properties: {
    eventHubEndpoints: {
      events: {
        retentionTimeInDays: 1
        partitionCount: 4
      }
    }
    routing: {
      fallbackRoute: {
        name: '$fallback'
        source: 'DeviceMessages'
        condition: 'true'
        endpointNames: ['events']
        isEnabled: true
      }
    }
  }
}

// Consumer group for the telemetry service
resource consumerGroup 'Microsoft.Devices/IotHubs/eventHubEndpoints/ConsumerGroups@2023-06-30' = {
  name: '${iotHub.name}/events/telemetry-service'
  properties: {}
}

// RBAC: IoT Hub Data Contributor for the managed identity
resource iotHubRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(principalId)) {
  scope: iotHub
  name: guid(resourceGroup().id, 'iothub-role', iotHubName, principalId)
  properties: {
    // IoT Hub Data Contributor
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4fc6c259-987e-4a07-842e-c321cc9d413f')
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}

@description('IoT Hub hostname')
output hostName string = iotHub.properties.hostName

@description('IoT Hub Event Hub-compatible endpoint')
output eventHubEndpoint string = iotHub.properties.eventHubEndpoints.events.endpoint

@description('IoT Hub Event Hub-compatible path')
output eventHubPath string = iotHub.properties.eventHubEndpoints.events.path

@description('IoT Hub resource ID')
output resourceId string = iotHub.id
