/**
 * DTDL (Digital Twins Definition Language) model templates.
 * Based on the Azure Digital Twins end-to-end tutorial models
 * plus additional manufacturing-oriented models.
 *
 * @see https://learn.microsoft.com/en-us/azure/digital-twins/tutorial-end-to-end
 */

// ─── Tutorial Models (Building Scenario) ──────────────────────────────────────

export const FloorModel = {
  "@id": "dtmi:example:Floor;1",
  "@type": "Interface",
  displayName: "Floor",
  "@context": "dtmi:dtdl:context;2",
  contents: [
    {
      "@type": "Property",
      name: "AverageTemperature",
      schema: "double",
    },
    {
      "@type": "Relationship",
      name: "contains",
      target: "dtmi:example:Room;1",
    },
  ],
};

export const RoomModel = {
  "@id": "dtmi:example:Room;1",
  "@type": "Interface",
  displayName: "Room",
  "@context": "dtmi:dtdl:context;2",
  contents: [
    {
      "@type": "Property",
      name: "Temperature",
      schema: "double",
    },
    {
      "@type": "Property",
      name: "HumidityLevel",
      schema: "double",
    },
    {
      "@type": "Relationship",
      name: "contains",
    },
  ],
};

export const ThermostatModel = {
  "@id": "dtmi:example:Thermostat;1",
  "@type": "Interface",
  displayName: "Thermostat",
  "@context": "dtmi:dtdl:context;2",
  contents: [
    {
      "@type": "Telemetry",
      name: "Temperature",
      schema: "double",
    },
    {
      "@type": "Property",
      name: "Temperature",
      schema: "double",
    },
  ],
};

// ─── Manufacturing Models ─────────────────────────────────────────────────────

export const ProductionLineModel = {
  "@id": "dtmi:manufacturing:ProductionLine;1",
  "@type": "Interface",
  displayName: "Production Line",
  "@context": "dtmi:dtdl:context;2",
  contents: [
    {
      "@type": "Property",
      name: "LineName",
      schema: "string",
    },
    {
      "@type": "Property",
      name: "Status",
      schema: {
        "@type": "Enum",
        valueSchema: "string",
        enumValues: [
          { name: "Running", enumValue: "Running" },
          { name: "Stopped", enumValue: "Stopped" },
          { name: "Maintenance", enumValue: "Maintenance" },
          { name: "Idle", enumValue: "Idle" },
        ],
      },
    },
    {
      "@type": "Property",
      name: "Throughput",
      schema: "double",
    },
    {
      "@type": "Relationship",
      name: "hasStation",
      target: "dtmi:manufacturing:Station;1",
    },
  ],
};

export const StationModel = {
  "@id": "dtmi:manufacturing:Station;1",
  "@type": "Interface",
  displayName: "Station",
  "@context": "dtmi:dtdl:context;2",
  contents: [
    {
      "@type": "Property",
      name: "StationName",
      schema: "string",
    },
    {
      "@type": "Property",
      name: "StationType",
      schema: "string",
    },
    {
      "@type": "Property",
      name: "Status",
      schema: "string",
    },
    {
      "@type": "Relationship",
      name: "hasEquipment",
    },
    {
      "@type": "Relationship",
      name: "hasSensor",
    },
  ],
};

export const MotorModel = {
  "@id": "dtmi:manufacturing:Motor;1",
  "@type": "Interface",
  displayName: "Motor",
  "@context": "dtmi:dtdl:context;2",
  contents: [
    {
      "@type": "Property",
      name: "MotorName",
      schema: "string",
    },
    {
      "@type": "Property",
      name: "RatedPower",
      schema: "double",
    },
    {
      "@type": "Property",
      name: "CurrentRPM",
      schema: "double",
    },
    {
      "@type": "Telemetry",
      name: "Vibration",
      schema: "double",
    },
    {
      "@type": "Telemetry",
      name: "Temperature",
      schema: "double",
    },
    {
      "@type": "Relationship",
      name: "hasSensor",
    },
  ],
};

export const TemperatureSensorModel = {
  "@id": "dtmi:manufacturing:TemperatureSensor;1",
  "@type": "Interface",
  displayName: "Temperature Sensor",
  "@context": "dtmi:dtdl:context;2",
  contents: [
    {
      "@type": "Telemetry",
      name: "Temperature",
      schema: "double",
    },
    {
      "@type": "Property",
      name: "Temperature",
      schema: "double",
    },
    {
      "@type": "Property",
      name: "Unit",
      schema: "string",
    },
  ],
};

export const VibrationSensorModel = {
  "@id": "dtmi:manufacturing:VibrationSensor;1",
  "@type": "Interface",
  displayName: "Vibration Sensor",
  "@context": "dtmi:dtdl:context;2",
  contents: [
    {
      "@type": "Telemetry",
      name: "Vibration",
      schema: "double",
    },
    {
      "@type": "Property",
      name: "Vibration",
      schema: "double",
    },
    {
      "@type": "Property",
      name: "Unit",
      schema: "string",
    },
    {
      "@type": "Property",
      name: "ThresholdHigh",
      schema: "double",
    },
  ],
};

export const HumiditySensorModel = {
  "@id": "dtmi:manufacturing:HumiditySensor;1",
  "@type": "Interface",
  displayName: "Humidity Sensor",
  "@context": "dtmi:dtdl:context;2",
  contents: [
    {
      "@type": "Telemetry",
      name: "Humidity",
      schema: "double",
    },
    {
      "@type": "Property",
      name: "Humidity",
      schema: "double",
    },
    {
      "@type": "Property",
      name: "Unit",
      schema: "string",
    },
  ],
};

export const EnergyMeterModel = {
  "@id": "dtmi:manufacturing:EnergyMeter;1",
  "@type": "Interface",
  displayName: "Energy Meter",
  "@context": "dtmi:dtdl:context;2",
  contents: [
    {
      "@type": "Telemetry",
      name: "PowerConsumption",
      schema: "double",
    },
    {
      "@type": "Property",
      name: "PowerConsumption",
      schema: "double",
    },
    {
      "@type": "Property",
      name: "Unit",
      schema: "string",
    },
    {
      "@type": "Property",
      name: "VoltageRating",
      schema: "double",
    },
  ],
};

export const ConveyorModel = {
  "@id": "dtmi:manufacturing:Conveyor;1",
  "@type": "Interface",
  displayName: "Conveyor",
  "@context": "dtmi:dtdl:context;2",
  contents: [
    {
      "@type": "Property",
      name: "ConveyorName",
      schema: "string",
    },
    {
      "@type": "Property",
      name: "Speed",
      schema: "double",
    },
    {
      "@type": "Property",
      name: "Length",
      schema: "double",
    },
    {
      "@type": "Property",
      name: "Status",
      schema: "string",
    },
    {
      "@type": "Telemetry",
      name: "Speed",
      schema: "double",
    },
    {
      "@type": "Relationship",
      name: "hasSensor",
    },
  ],
};

export const RobotArmModel = {
  "@id": "dtmi:manufacturing:RobotArm;1",
  "@type": "Interface",
  displayName: "Robot Arm",
  "@context": "dtmi:dtdl:context;2",
  contents: [
    {
      "@type": "Property",
      name: "RobotName",
      schema: "string",
    },
    {
      "@type": "Property",
      name: "Axes",
      schema: "integer",
    },
    {
      "@type": "Property",
      name: "Payload",
      schema: "double",
    },
    {
      "@type": "Property",
      name: "Status",
      schema: "string",
    },
    {
      "@type": "Telemetry",
      name: "CycleTime",
      schema: "double",
    },
    {
      "@type": "Relationship",
      name: "hasSensor",
    },
  ],
};

// ─── Lights-Out Manufacturing Models ──────────────────────────────────────────

export const QualityCheckpointModel = {
  "@id": "dtmi:manufacturing:QualityCheckpoint;1",
  "@type": "Interface",
  displayName: "Quality Checkpoint",
  "@context": "dtmi:dtdl:context;2",
  contents: [
    {
      "@type": "Property",
      name: "CheckpointName",
      schema: "string",
    },
    {
      "@type": "Property",
      name: "InspectionType",
      schema: "string",
    },
    {
      "@type": "Telemetry",
      name: "DefectRate",
      schema: "double",
    },
    {
      "@type": "Telemetry",
      name: "PassRate",
      schema: "double",
    },
    {
      "@type": "Property",
      name: "DefectRate",
      schema: "double",
    },
    {
      "@type": "Property",
      name: "PassRate",
      schema: "double",
    },
    {
      "@type": "Relationship",
      name: "hasSensor",
    },
  ],
};

export const PLCControllerModel = {
  "@id": "dtmi:manufacturing:PLCController;1",
  "@type": "Interface",
  displayName: "PLC Controller",
  "@context": "dtmi:dtdl:context;2",
  contents: [
    {
      "@type": "Property",
      name: "ControllerName",
      schema: "string",
    },
    {
      "@type": "Property",
      name: "FirmwareVersion",
      schema: "string",
    },
    {
      "@type": "Property",
      name: "Status",
      schema: "string",
    },
    {
      "@type": "Telemetry",
      name: "CpuLoad",
      schema: "double",
    },
    {
      "@type": "Telemetry",
      name: "MemoryUsage",
      schema: "double",
    },
    {
      "@type": "Property",
      name: "CpuLoad",
      schema: "double",
    },
    {
      "@type": "Relationship",
      name: "controls",
    },
  ],
};

// ─── Factory Templates (pre-built layouts) ────────────────────────────────────

export interface FactoryTemplate {
  id: string;
  name: string;
  description: string;
  models: Record<string, unknown>[];
  twins: Array<{ id: string; modelId: string; properties: Record<string, unknown> }>;
  relationships: Array<{ sourceId: string; targetId: string; name: string }>;
}

export const FACTORY_TEMPLATES: FactoryTemplate[] = [
  {
    id: "building-tutorial",
    name: "Building (Tutorial)",
    description: "Azure Digital Twins end-to-end tutorial: Floor → Room → Thermostat with temperature telemetry.",
    models: [FloorModel, RoomModel, ThermostatModel],
    twins: [
      { id: "floor1", modelId: "dtmi:example:Floor;1", properties: {} },
      { id: "room21", modelId: "dtmi:example:Room;1", properties: { Temperature: 0, HumidityLevel: 0 } },
      { id: "thermostat67", modelId: "dtmi:example:Thermostat;1", properties: { Temperature: 0 } },
    ],
    relationships: [
      { sourceId: "floor1", targetId: "room21", name: "contains" },
      { sourceId: "room21", targetId: "thermostat67", name: "contains" },
    ],
  },
  {
    id: "bottling-line",
    name: "Bottling Production Line",
    description: "A bottling line with filler, capper, and labeler stations, each with motors and sensors.",
    models: [ProductionLineModel, StationModel, MotorModel, TemperatureSensorModel, VibrationSensorModel],
    twins: [
      { id: "bottling_line_1", modelId: "dtmi:manufacturing:ProductionLine;1", properties: { LineName: "Bottling Line 1", Status: "Running" } },
      { id: "filler", modelId: "dtmi:manufacturing:Station;1", properties: { StationName: "Filler", StationType: "Filling", Status: "Running" } },
      { id: "capper", modelId: "dtmi:manufacturing:Station;1", properties: { StationName: "Capper", StationType: "Capping", Status: "Running" } },
      { id: "labeler", modelId: "dtmi:manufacturing:Station;1", properties: { StationName: "Labeler", StationType: "Labeling", Status: "Running" } },
      { id: "filler_motor", modelId: "dtmi:manufacturing:Motor;1", properties: { MotorName: "Filler Motor", RatedPower: 5.5 } },
      { id: "capper_motor", modelId: "dtmi:manufacturing:Motor;1", properties: { MotorName: "Capper Motor", RatedPower: 3.0 } },
      { id: "labeler_motor", modelId: "dtmi:manufacturing:Motor;1", properties: { MotorName: "Labeler Motor", RatedPower: 2.2 } },
      { id: "filler_temp", modelId: "dtmi:manufacturing:TemperatureSensor;1", properties: { Unit: "Celsius" } },
      { id: "filler_vib", modelId: "dtmi:manufacturing:VibrationSensor;1", properties: { Unit: "mm/s", ThresholdHigh: 10.0 } },
    ],
    relationships: [
      { sourceId: "bottling_line_1", targetId: "filler", name: "hasStation" },
      { sourceId: "bottling_line_1", targetId: "capper", name: "hasStation" },
      { sourceId: "bottling_line_1", targetId: "labeler", name: "hasStation" },
      { sourceId: "filler", targetId: "filler_motor", name: "hasEquipment" },
      { sourceId: "capper", targetId: "capper_motor", name: "hasEquipment" },
      { sourceId: "labeler", targetId: "labeler_motor", name: "hasEquipment" },
      { sourceId: "filler_motor", targetId: "filler_temp", name: "hasSensor" },
      { sourceId: "filler_motor", targetId: "filler_vib", name: "hasSensor" },
    ],
  },
  {
    id: "automotive-cell",
    name: "Automotive Assembly Cell",
    description: "An automotive assembly cell with robot arms, conveyors, and quality sensors.",
    models: [ProductionLineModel, StationModel, RobotArmModel, ConveyorModel, TemperatureSensorModel, VibrationSensorModel],
    twins: [
      { id: "assembly_line_1", modelId: "dtmi:manufacturing:ProductionLine;1", properties: { LineName: "Assembly Line 1", Status: "Running" } },
      { id: "welding_station", modelId: "dtmi:manufacturing:Station;1", properties: { StationName: "Welding Station", StationType: "Welding" } },
      { id: "painting_station", modelId: "dtmi:manufacturing:Station;1", properties: { StationName: "Painting Station", StationType: "Painting" } },
      { id: "welder_robot", modelId: "dtmi:manufacturing:RobotArm;1", properties: { RobotName: "Welder Robot", Axes: 6, Payload: 20.0 } },
      { id: "painter_robot", modelId: "dtmi:manufacturing:RobotArm;1", properties: { RobotName: "Painter Robot", Axes: 6, Payload: 10.0 } },
      { id: "main_conveyor", modelId: "dtmi:manufacturing:Conveyor;1", properties: { ConveyorName: "Main Conveyor", Length: 50.0 } },
    ],
    relationships: [
      { sourceId: "assembly_line_1", targetId: "welding_station", name: "hasStation" },
      { sourceId: "assembly_line_1", targetId: "painting_station", name: "hasStation" },
      { sourceId: "welding_station", targetId: "welder_robot", name: "hasEquipment" },
      { sourceId: "painting_station", targetId: "painter_robot", name: "hasEquipment" },
      { sourceId: "assembly_line_1", targetId: "main_conveyor", name: "hasEquipment" },
    ],
  },
  {
    id: "lights-out-cell",
    name: "Lights-Out Manufacturing Cell",
    description:
      "A fully autonomous manufacturing cell with robot arms, conveyors, quality inspection, PLC controllers, and comprehensive sensor coverage for unmanned operation.",
    models: [
      ProductionLineModel,
      StationModel,
      RobotArmModel,
      ConveyorModel,
      MotorModel,
      TemperatureSensorModel,
      VibrationSensorModel,
      HumiditySensorModel,
      EnergyMeterModel,
      QualityCheckpointModel,
      PLCControllerModel,
    ],
    twins: [
      { id: "lo_line_1", modelId: "dtmi:manufacturing:ProductionLine;1", properties: { LineName: "Lights-Out Cell 1", Status: "Running", Throughput: 0 } },
      // Stations
      { id: "lo_machining", modelId: "dtmi:manufacturing:Station;1", properties: { StationName: "CNC Machining", StationType: "Machining", Status: "Running" } },
      { id: "lo_assembly", modelId: "dtmi:manufacturing:Station;1", properties: { StationName: "Robotic Assembly", StationType: "Assembly", Status: "Running" } },
      { id: "lo_inspection", modelId: "dtmi:manufacturing:Station;1", properties: { StationName: "Quality Inspection", StationType: "Inspection", Status: "Running" } },
      { id: "lo_packaging", modelId: "dtmi:manufacturing:Station;1", properties: { StationName: "Auto Packaging", StationType: "Packaging", Status: "Running" } },
      // Equipment
      { id: "lo_cnc_robot", modelId: "dtmi:manufacturing:RobotArm;1", properties: { RobotName: "CNC Load/Unload Robot", Axes: 6, Payload: 25.0, Status: "Running" } },
      { id: "lo_assembly_robot", modelId: "dtmi:manufacturing:RobotArm;1", properties: { RobotName: "Assembly Robot", Axes: 6, Payload: 15.0, Status: "Running" } },
      { id: "lo_inbound_conveyor", modelId: "dtmi:manufacturing:Conveyor;1", properties: { ConveyorName: "Inbound Conveyor", Length: 20.0, Status: "Running" } },
      { id: "lo_outbound_conveyor", modelId: "dtmi:manufacturing:Conveyor;1", properties: { ConveyorName: "Outbound Conveyor", Length: 15.0, Status: "Running" } },
      { id: "lo_spindle_motor", modelId: "dtmi:manufacturing:Motor;1", properties: { MotorName: "CNC Spindle Motor", RatedPower: 15.0 } },
      // Controllers
      { id: "lo_main_plc", modelId: "dtmi:manufacturing:PLCController;1", properties: { ControllerName: "Main Cell PLC", FirmwareVersion: "4.2.1", Status: "Online" } },
      // Quality
      { id: "lo_quality_check", modelId: "dtmi:manufacturing:QualityCheckpoint;1", properties: { CheckpointName: "Vision + CMM Inspection", InspectionType: "automated", DefectRate: 0, PassRate: 100 } },
      // Sensors
      { id: "lo_spindle_temp", modelId: "dtmi:manufacturing:TemperatureSensor;1", properties: { Unit: "Celsius" } },
      { id: "lo_spindle_vib", modelId: "dtmi:manufacturing:VibrationSensor;1", properties: { Unit: "mm/s", ThresholdHigh: 5.0 } },
      { id: "lo_ambient_temp", modelId: "dtmi:manufacturing:TemperatureSensor;1", properties: { Unit: "Celsius" } },
      { id: "lo_ambient_humidity", modelId: "dtmi:manufacturing:HumiditySensor;1", properties: { Unit: "%" } },
      { id: "lo_energy_meter", modelId: "dtmi:manufacturing:EnergyMeter;1", properties: { Unit: "kW", VoltageRating: 480 } },
    ],
    relationships: [
      // Line → Stations
      { sourceId: "lo_line_1", targetId: "lo_machining", name: "hasStation" },
      { sourceId: "lo_line_1", targetId: "lo_assembly", name: "hasStation" },
      { sourceId: "lo_line_1", targetId: "lo_inspection", name: "hasStation" },
      { sourceId: "lo_line_1", targetId: "lo_packaging", name: "hasStation" },
      // Station → Equipment
      { sourceId: "lo_machining", targetId: "lo_cnc_robot", name: "hasEquipment" },
      { sourceId: "lo_machining", targetId: "lo_spindle_motor", name: "hasEquipment" },
      { sourceId: "lo_assembly", targetId: "lo_assembly_robot", name: "hasEquipment" },
      { sourceId: "lo_inspection", targetId: "lo_quality_check", name: "hasEquipment" },
      // Conveyors
      { sourceId: "lo_line_1", targetId: "lo_inbound_conveyor", name: "hasEquipment" },
      { sourceId: "lo_line_1", targetId: "lo_outbound_conveyor", name: "hasEquipment" },
      // Controller → Equipment
      { sourceId: "lo_main_plc", targetId: "lo_cnc_robot", name: "controls" },
      { sourceId: "lo_main_plc", targetId: "lo_assembly_robot", name: "controls" },
      { sourceId: "lo_main_plc", targetId: "lo_inbound_conveyor", name: "controls" },
      { sourceId: "lo_main_plc", targetId: "lo_outbound_conveyor", name: "controls" },
      // Sensors
      { sourceId: "lo_spindle_motor", targetId: "lo_spindle_temp", name: "hasSensor" },
      { sourceId: "lo_spindle_motor", targetId: "lo_spindle_vib", name: "hasSensor" },
      { sourceId: "lo_machining", targetId: "lo_ambient_temp", name: "hasSensor" },
      { sourceId: "lo_machining", targetId: "lo_ambient_humidity", name: "hasSensor" },
      { sourceId: "lo_line_1", targetId: "lo_energy_meter", name: "hasSensor" },
    ],
  },
];

/** Look up all available built-in model definitions by display name */
export const MODEL_LIBRARY: Record<string, Record<string, unknown>> = {
  Floor: FloorModel,
  Room: RoomModel,
  Thermostat: ThermostatModel,
  "Production Line": ProductionLineModel,
  Station: StationModel,
  Motor: MotorModel,
  "Temperature Sensor": TemperatureSensorModel,
  "Vibration Sensor": VibrationSensorModel,
  "Humidity Sensor": HumiditySensorModel,
  "Energy Meter": EnergyMeterModel,
  Conveyor: ConveyorModel,
  "Robot Arm": RobotArmModel,
  "Quality Checkpoint": QualityCheckpointModel,
  "PLC Controller": PLCControllerModel,
};
