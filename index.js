// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const bodyParser = require('body-parser');
// const connectDB = require('./db/connect');
// const mqttClient = require('./mqtt/mqttClient');
// const { Server } = require('socket.io');
// const fs = require('fs');
// const https = require('https');
// const mongoose = require('mongoose');

// const Device = require('./models/Device.model');
// const Entity = require('./models/entity.model');
// const { energyRawHistoryController } = require('./controllers/energyMeterRawHistory.controller');
// const { entityRawHistoryController } = require('./controllers/entityRawHistory.controller');
// const { scheduleAggregations } = require("./DbScheduling/energyAggregator");

// const mongodb_Url = process.env.MONGO_URI;
// const app = express();

// // Middleware
// const corsOptions = {
//   origin: "https://cloud-iot.vercel.app",
//   methods: "GET,POST,PUT,DELETE",
//   credentials: true,
// };

// app.use(cors());
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

// // SSL Certificates
// const credentials = {
//   key: fs.readFileSync('./certs/private.key', 'utf8'),
//   cert: fs.readFileSync('./certs/certificate.crt', 'utf8'),
//   ca: fs.readFileSync('./certs/ca_bundle.crt', 'utf8')
// };

// // Routes
// const entityRoutes = require('./routes/entity.route');
// const userRoutes = require('./routes/user');
// const deviceRoutes = require('./routes/devices.route');
// const automationRoutes = require('./routes/automation.route');
// const entityHistoryModel = require('./models/entityHistory.model');
// const EntityHistory = require("./routes/history.route");
// const AirconditionerRoutes = require("./routes/airConditioner.route");
// const entityHistoryRoutes = require("./routes/entityHistory.route");
// const wmsRoutes = require("./routes/wms.route");

// app.use('/user', userRoutes);
// app.use('/device', deviceRoutes);
// app.use('/entity', entityRoutes);
// app.use('/automation', automationRoutes);
// app.use('/energy', EntityHistory);
// app.use("/ac", AirconditionerRoutes);
// app.use("/entity-history", entityHistoryRoutes);
// app.use("/wms", wmsRoutes);

// app.get('/', (req, res) => {
//   res.status(200).json({ message: "Server is running" });
// });

// const port = process.env.PORT || 5000;
// const dbConnectionString = mongodb_Url;

// const start = async () => {
//   try {
//     await connectDB(dbConnectionString);

//     mongoose.connection.once("open", async () => {
//       console.log("✅ Database connection open — starting HTTPS server...");

//       scheduleAggregations();
//       // acHistoricFunction();

//       const server = https.createServer(credentials, app);
//       const io = new Server(server, { cors: { origin: "*" } });

//       server.listen(port, () => {
//         console.log(`🚀 Server is running securely on port ${port}`);
//       });

//       // Subscribe to entity topics
//       const entities = await Entity.find({ isActive: true });
//       entities.forEach((entity) => {
//         mqttClient.subscribe(entity.subscribeTopic, (err) => {
//           if (err) {
//             console.error(`Failed to subscribe to ${entity.subscribeTopic}:`, err);
//           } else {
//             console.log(`Subscribed to topic: ${entity.subscribeTopic}`);
//           }
//         });
//       });

//       // WebSocket handling
//       io.on('connection', async (socket) => {
//         console.log(`New WebSocket client connected: ${socket.id}`);

//         try {
//           const entities = await Entity.find({ isActive: true }).populate('device', 'name isActive');
//           const filteredEntities = entities.filter(entity =>
//             entity.device && entity.device.isActive &&
//             !entity.device.name.includes("Meter") &&
//             !entity.device.name.includes("Water")
//           );

//           const groupedEntities = filteredEntities.reduce((groups, entity) => {
//             if (!entity.device) {
//               console.warn(`Entity with ID ${entity._id} does not have an associated device`);
//               return groups;
//             }

//             const deviceId = entity.device._id.toString();
//             if (!groups[deviceId]) {
//               groups[deviceId] = {
//                 deviceId: entity.device._id,
//                 deviceName: entity.device.name,
//                 entities: [],
//               };
//             }

//             groups[deviceId].entities.push({
//               _id: entity._id,
//               entityName: entity.entityName,
//               entityId: entity.entityId,
//               subscribeTopic: entity.subscribeTopic,
//               publishTopic: entity.publishTopic,
//               stateType: entity.stateType,
//               state: entity.state,
//             });

//             return groups;
//           }, {});

//           socket.emit('initial_state', { devices: Object.values(groupedEntities) });
//         } catch (error) {
//           console.error('Error fetching initial state:', error);
//         }

//         socket.on('state_change', async ({ publishTopic, state }) => {
//           try {
//             console.log(`Received state change request for topic: ${publishTopic}, state: ${state}`);
//             const entity = await Entity.findOne({ publishTopic });
//             const stateString = typeof state === 'number' ? state.toString() : state;

//             if (entity) {
//               mqttClient.publish(publishTopic, stateString, (err) => {
//                 if (err) console.error('Failed to publish MQTT message:', err);
//               });
//             }
//           } catch (error) {
//             console.error('Error handling state change:', error);
//           }
//         });

//         socket.on('disconnect', () => {
//           console.log('Client disconnected');
//         });
//       });

//       // MQTT message handling
//       mqttClient.on('message', async (topic, message) => {
//         console.log(`Received MQTT message on topic ${topic}: ${message.toString()}`);
//         try {
//           const entity = await Entity.findOne({ subscribeTopic: topic });
//           if (entity) {
//             const newState = message.toString();
//             entity.state = newState;
//             entity.updatedAt = new Date();
//             await entity.save();

//             const entityId = entity._id;
//             const deviceId = entity.device;

//             await energyRawHistoryController(entity, entityId, deviceId, newState);
//             await entityRawHistoryController(entity, entityId, deviceId, newState);

//             io.emit('state_update', {
//               deviceId: entity.device,
//               entityId: entity._id,
//               state: newState,
//             });
//           } else {
//             console.warn(`No entity found for topic: ${topic}`);
//           }
//         } catch (error) {
//           console.error('Error handling MQTT message:', error);
//         }
//       });
//     });
//   } catch (error) {
//     console.error('Failed to start server:', error);
//   }
// };

// // Error handling
// process.on("unhandledRejection", (reason) => {
//   console.error("⚠️ Unhandled Rejection:", reason);
// });

// process.on("uncaughtException", (err) => {
//   console.error("💥 Uncaught Exception:", err);
// });

// start();
// module.exports = app;










require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./db/connect');
const mqttClient = require('./mqtt/mqttClient');
const { Server } = require('socket.io');
const fs = require('fs');
const https = require('https');
// const http = require('http');
const Device = require('./models/Device.model');
const Entity = require('./models/entity.model');
const {energyRawHistoryController} = require('./controllers/energyMeterRawHistory.controller');
const { entityRawHistoryController } = require('./controllers/entityRawHistory.controller');
const { scheduleAggregations } = require("./DbScheduling/energyAggregator");
// const acHistoricFunction = require('./services/acHistoricData');
const mongodb_Url = process.env.MONGO_URI;
const app = express();
// Middleware

const corsOptions = {
    origin: "https://cloud-iot.vercel.app",
    methods: "GET,POST,PUT,DELETE",
    credentials: true, 
};

// app.use(cors(corsOptions));
app.use(cors());
// Read self-signed certs
const credentials = {
  key: fs.readFileSync('./certs/private.key', 'utf8'),
  cert: fs.readFileSync('./certs/certificate.crt', 'utf8'),
  ca: fs.readFileSync('./certs/ca_bundle.crt', 'utf8')
};
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const entityRoutes = require('./routes/entity.route');
const userRoutes = require('./routes/user');
const deviceRoutes = require('./routes/devices.route');
const automationRoutes = require('./routes/automation.route');
const entityHistoryModel = require('./models/entityHistory.model');
const EntityHistory= require("./routes/history.route");
const AirconditionerRoutes = require("./routes/airConditioner.route")
const entityHistoryRoutes = require("./routes/entityHistory.route")
const wmsRoutes= require("./routes/wms.route")
app.use('/user', userRoutes);
app.use('/device', deviceRoutes);
app.use('/entity', entityRoutes);
app.use('/automation', automationRoutes);
app.use('/energy', EntityHistory);
app.use("/ac", AirconditionerRoutes);
app.use("/entity-history", entityHistoryRoutes);
app.use("/wms", wmsRoutes);
app.get('/', (req, res) => { res.status(200).json({message:"Server is running"})})
// Start server
const port = process.env.PORT || 5000;
const dbConnectionString = mongodb_Url;

const start = async () => {
    try {
        await connectDB(dbConnectionString);
        console.log('Connected to database');
scheduleAggregations();
// acHistoricFunction();
        // const server = http.createServer(app);
        const server = https.createServer(credentials, app);
        
        const io = new Server(server, {
            cors: {
                origin: "*", 
            },
        });

        server.listen(port, () => {
            console.log(`Server is listening on port ${port}`);
        });

        // Fetch all active entities from the database and subscribe to their MQTT topics
        const entities = await Entity.find({ isActive: true });
//          const entities = await Entity.find({ isActive: true, entityName: {
//     $nin: [
//         "PZEM-004T V3 Current",
//         "PZEM-004T V3 Voltage",
//         "PZEM-004T V3 Power",
//         "PZEM-004T V3 Frequency",
//         "PZEM-004T V3 Power Factor"
//     ]
// } });
        entities.forEach((entity) => {
            mqttClient.subscribe(entity.subscribeTopic, (err) => {
                if (err) {
                    console.error(`Failed to subscribe to ${entity.subscribeTopic}:`, err);
                } else {
                    console.log(`Subscribed to topic: ${entity.subscribeTopic}`);
                }
            });
        });

        io.on('connection', async (socket) => {
            console.log(`New WebSocket client connected: ${socket.id}`);        
            try {
                // Fetch all entities grouped by devices
     const entities = await Entity.find({ isActive: true }).populate('device', 'name isActive');
                // exclude entitties whos devices is inactive
                // const filteredEntities = entities.filter(entity => entity.device && entity.device.isActive);
                                const filteredEntities = entities.filter(entity => entity.device && entity.device.isActive && !entity.device.name.includes("Meter") && !entity.device.name.includes("Water"));
                const groupedEntities = filteredEntities.reduce((groups, entity) => {
                    if (!entity.device) {
                        console.warn(`Entity with ID ${entity._id} does not have an associated device`);
                        return groups;
                    }
                
                    const deviceId = entity.device.toString();
                
                    if (!groups[deviceId]) {
                        groups[deviceId] = {
                            deviceId: entity.device._id,
                            deviceName: entity.device.name,
                            // isActive: entity.device.isActive,
                            entities: [],
                        };
                    }
                    groups[deviceId].entities.push({
                        _id: entity._id,
                        entityName: entity.entityName,
                        entityId: entity.entityId,
                        subscribeTopic: entity.subscribeTopic,
                        publishTopic: entity.publishTopic,
                        stateType: entity.stateType,
                        state: entity.state,
                        // history: entity.history,
                    });
                    return groups;
                }, {});
                
        
                // Send grouped entities to the client
                socket.emit('initial_state', { devices: Object.values(groupedEntities) });
        
                // console.log('Sent grouped entities to the client',groupedEntities);
            } catch (error) {
                console.error('Error fetching initial state:', error);
            }
        
            // Handle state change requests
            socket.on('state_change', async ({ publishTopic, state }) => {
                try {
                    console.log(`Received state change request for topic: ${publishTopic}, state: ${state}`);
        
                    const entity = await Entity.findOne({ publishTopic });
                    const stateString = typeof state === 'number' ? state.toString() : state;
                    if (entity) {
                        // Publish new state to MQTT topic
                        mqttClient.publish(publishTopic, stateString, (err) => {
                            if (err) {
                                console.error('Failed to publish MQTT message:', err);
                            } else {
                                // console.log(`Published new state to topic ${publishTopic}: ${state}`);
                            }
                        });
        
                        // Update the entity state in the database
                    //     entity.state = state;
                    //     entity.updatedAt = new Date();
                    //     await entity.save();
        
                    //    // Broadcast updated state to all clients
                    //     io.emit('state_update', {
                    //         deviceId: entity.device,
                    //         entityId: entity._id,
                    //         state,
                    //     });
                    }
                } catch (error) {
                    console.error('Error handling state change:', error);
                }
            });
        
            socket.on('disconnect', () => {
                console.log('Client disconnected');
            });
        });
        
        

        // Listen for MQTT messages and update React clients
        mqttClient.on('message', async (topic, message) => {
            // console.log(`Received MQTT message on topic ${topic}: ${message.toString()}`);
            try {
                const entity = await Entity.findOne({ subscribeTopic: topic });
                if (entity) {
                    // Update the entity's state in the database
                    const newState = message.toString();
                    entity.state = newState;
                    entity.updatedAt = new Date();
                    await entity.save();
        
                    // console.log(`Updated state for entity ${entity.entityName} (${entity._id}): ${newState}` );
        
                    // Update or create entity history
    const entityId = entity._id; // Fetch the entity's Id
    const deviceId = entity.device;

    // Store raw history for energy meters and all other entities
    await energyRawHistoryController(entity, entityId, deviceId, newState);
    await entityRawHistoryController(entity, entityId, deviceId, newState);

    // console.log(`Updated history for entity ${entity.entityName} (${entity._id}) with device (${deviceId}).`);

                    // try {
                    //     const entityId = entity._id; // Fetch the entity's Id
                    //     const deviceId = entity.device; 
                    //     let entityHistory = await entityHistoryModel.findOne({ entityId });
        
                    //     if (entityHistory) {
                    //         // Push a new history entry
                    //         entityHistory.history.push({ value: newState, time: new Date() });
                        
                    //         await entityHistory.save();
                    //         await energyRawHistoryController(entity, entityId, deviceId, newState);
                    //         await entityRawHistoryController(entity, entityId, deviceId, newState); // <-- add this
                    //     } else {
                    //         // Create a new entity history document if it doesn't exist
                    //         entityHistory = new entityHistoryModel({
                    //             entityId: entityId,
                    //             deviceId: deviceId,
                    //             history: [{ value: newState, time: new Date() }],
                    //         });
                    //         await entityHistory.save();
                    //         await energyRawHistoryController(entity, entityId, deviceId, newState);
                    //         await entityRawHistoryController(entity, entityId, deviceId, newState); // <-- add this
                    //     }
        
                    //     console.log(`Updated history for entity ${entity.entityName} (${entity._id}) with device (${deviceId}).`);
                    // } catch (historyError) {
                    //     console.error('Error updating entity history:', historyError);
                    // }
        
                    // Broadcast the updated state to all WebSocket clients
                    io.emit('state_update', {
                        deviceId: entity.device,
                        entityId: entity._id,
                        state: newState,
                    });
                } else {
                    console.warn(`No entity found for topic: ${topic}`);
                }
            } catch (error) {
                console.error('Error handling MQTT message:', error);
            }
        });
        
        // Fetch all deviceIds and subscribe to their status topics
        // async function subscribeToDeviceStatusTopics() {
        //     const devices = await Device.find({});
        //     devices.forEach(device => {
        //         const statusTopic = `${device.deviceId}/status`;
        //         mqttClient.subscribe(statusTopic, (err) => {
        //             if (err) {
        //                 console.error(`Failed to subscribe to ${statusTopic}:`, err);
        //             } else {
        //                 console.log(`Subscribed to ${statusTopic}`);
        //             }
        //         });
        //     });
        // }
        
        // Call this function on server start
        // subscribeToDeviceStatusTopics();
        
        // Handle status messages
//         mqttClient.on('message', async (topic, message) => {
//             console.log(`device status ${topic}: ${message.toString()}`);
//             const statusMatch = topic.match(/^(.+)\/status$/);
//             if (statusMatch) {
//                 const deviceId = statusMatch[1];
//                 const status = message.toString(); // "online" or "offline"
        
//                 // Find the device by deviceId field
//                 const device = await Device.findOne({ deviceId });
//                 if (device) {
//                     // Update device status in DB
//                     await Device.findByIdAndUpdate(device._id, { status });
        
//                     // If offline, update all related entity histories
//                     if (status === 'offline') {
//                         console.log(`Device ${device.name} (${device.deviceId}) is online.`);
//                         const entities = await Entity.find({ device: device._id });

//                         for (const entity of entities) {

//                             await entityRawHistoryController(entity, entity._id, device._id, 'offline');
//                                 // await energyRawHistoryController(entity, entity_id, device_id, 'offline');
//                                  await energyRawHistoryController(entity, entity._id, device._id, 'offline');
//                     // Update the entity's state in the database
//                     // const newState = message.toString();
//                    entity.state = "offline";
//     entity.updatedAt = new Date();
//     await entity.save();

//     console.log(`Updated state for entity ${entity.entityName} (${entity._id}): offline`);
// }       
//                     }
        
//                     // Emit status to frontend
//                     io.emit('device_status', { deviceId: device._id, status });
//                 }
//                 return;
//             }
        
//             // ...existing entity state handling...
//         });
        
    } catch (error) {
        console.error('Failed to start server:', error);
    }
};
start();
module.exports = app;
