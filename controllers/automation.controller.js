const AutomationModel = require("../models/Automation.model");
const axios = require('axios');

// Save automation data to the database
const saveAutomation = async (req, res) => {
    try {
        const automation = new AutomationModel(req.body);
        await automation.save();
        res.status(201).json({
            msg: "Automation saved successfully",
            automation: automation,
            status: true,
        });
    } catch (err) {
        res.status(500).json({
            msg: "Error saving automation",
            status: false,
            error: err.message,
        });
    }
};

// Retrieve all automation data from the database and get IP from device collection, entityID, domain, and state from Entity collection 
// const getAutomationDataWithDetails = async (req, res) => {
//     try {
//         const automations = await AutomationModel.aggregate([
//             {
//                 $lookup: {
//                     from: "devices",
//                     localField: "triggers.deviceId",
//                     foreignField: "_id",
//                     as: "triggerDevices"
//                 }
//             },
//             {
//                 $lookup: {
//                     from: "entities",
//                     localField: "triggers.entity_Id",
//                     foreignField: "_id",
//                     as: "triggerEntities"
//                 }
//             },
//             // Add similar lookups for conditions and actions
//             {
//                 $project: {
//                     _id: 1,
//                     triggers: {
//                         $map: {
//                             input: "$triggers",
//                             as: "trigger",
//                             in: {
//                                 deviceId: "$$trigger.deviceId",
//                                 entity_Id: "$$trigger.entity_Id",
//                                 conditionState: "$$trigger.conditionState",
//                                 above: "$$trigger.above",
//                                 below: "$$trigger.below",
//                                 deviceIp: {
//                                     $arrayElemAt: [
//                                         {
//                                             $filter: {
//                                                 input: "$triggerDevices",
//                                                 as: "device",
//                                                 cond: { $eq: ["$$device._id", "$$trigger.deviceId"] }
//                                             }
//                                         },
//                                         0
//                                     ]
//                                 },
//                                 entityID: { $arrayElemAt: ["$triggerEntities.entityId", 0] },
//                                 domain: { $arrayElemAt: ["$triggerEntities.domain", 0] },
//                                 state: { $arrayElemAt: ["$triggerEntities.state", 0] },
//                                 stateType: { $arrayElemAt: ["$triggerEntities.stateType", 0] },
//                             }
//                         }
//                     },
//                     // Similarly handle conditions and actions
//                 }
//             }
//         ]);

//         res.status(200).json({
//             msg: "Automation data retrieved successfully",
//             status: true,
//             automations: automations,
//         });
//     } catch (err) {
//         res.status(500).json({
//             msg: "Error retrieving automation data",
//             status: false,
//             error: err.message,
//         });
//     }
// };
const getAutomationDataWithDetails = async (req, res) => {
    try {
        const automations = await AutomationModel.aggregate([
            {
                $lookup: {
                    from: "devices",
                    localField: "triggers.deviceId",
                    foreignField: "_id",
                    as: "triggerDevices"
                }
            },
            {
                $lookup: {
                    from: "devices",
                    localField: "conditions.deviceId",
                    foreignField: "_id",
                    as: "conditionDevices"
                }
            },
            {
                $lookup: {
                    from: "devices",
                    localField: "actions.deviceId",
                    foreignField: "_id",
                    as: "actionDevices"
                }
            },
            {
                $lookup: {
                    from: "entities",
                    localField: "triggers.entity_Id",
                    foreignField: "_id",
                    as: "triggerEntities"
                }
            },
            {
                $lookup: {
                    from: "entities",
                    localField: "conditions.entity_Id",
                    foreignField: "_id",
                    as: "conditionEntities"
                }
            },
            {
                $lookup: {
                    from: "entities",
                    localField: "actions.entity_Id",
                    foreignField: "_id",
                    as: "actionEntities"
                }
            },
            {
                $project: {
                    _id: 1,
                    triggers: {
                        $map: {
                            input: "$triggers",
                            as: "trigger",
                            in: {
                                deviceId: "$$trigger.deviceId",
                                entity_Id: "$$trigger.entity_Id",
                                conditionState: "$$trigger.conditionState",
                                above: "$$trigger.above",
                                below: "$$trigger.below",
                                deviceIp: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: "$triggerDevices",
                                                as: "device",
                                                cond: { $eq: ["$$device._id", "$$trigger.deviceId"] }
                                            }
                                        },
                                        0
                                    ]
                                },
                                entityID: { $arrayElemAt: ["$triggerEntities.entityId", 0] },
                                domain: { $arrayElemAt: ["$triggerEntities.domain", 0] },
                                state: { $arrayElemAt: ["$triggerEntities.state", 0] },
                                stateType: { $arrayElemAt: ["$triggerEntities.stateType", 0] },
                            }
                        }
                    },
                    conditions: {
                        $map: {
                            input: "$conditions",
                            as: "condition",
                            in: {
                                deviceId: "$$condition.deviceId",
                                entity_Id: "$$condition.entity_Id",
                                conditionState: "$$condition.conditionState",
                                above: "$$condition.above",
                                below: "$$condition.below",
                                deviceIp: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: "$conditionDevices",
                                                as: "device",
                                                cond: { $eq: ["$$device._id", "$$condition.deviceId"] }
                                            }
                                        },
                                        0
                                    ]
                                },
                                entityID: { $arrayElemAt: ["$conditionEntities.entityId", 0] },
                                domain: { $arrayElemAt: ["$conditionEntities.domain", 0] },
                                state: { $arrayElemAt: ["$conditionEntities.state", 0] },
                                stateType: { $arrayElemAt: ["$conditionEntities.stateType", 0] },
                            }
                        }
                    },
                    actions: {
                        $map: {
                            input: "$actions",
                            as: "action",
                            in: {
                                deviceId: "$$action.deviceId",
                                entity_Id: "$$action.entity_Id",
                                conditionState: "$$action.conditionState",
                                deviceIp: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: "$actionDevices",
                                                as: "device",
                                                cond: { $eq: ["$$device._id", "$$action.deviceId"] }
                                            }
                                        },
                                        0
                                    ]
                                },
                                entityID: { $arrayElemAt: ["$actionEntities.entityId", 0] },
                                domain: { $arrayElemAt: ["$actionEntities.domain", 0] },
                                state: { $arrayElemAt: ["$actionEntities.state", 0] },
                                stateType: { $arrayElemAt: ["$actionEntities.stateType", 0] },
                            }
                        }
                    }
                }
            }
        ]);

        res.status(200).json({
            msg: "Automation data retrieved successfully",
            status: true,
            automations: automations,
        });
    } catch (err) {
        res.status(500).json({
            msg: "Error retrieving automation data",
            status: false,
            error: err.message,
        });
    }
};
// Processing automation logic based on conditions
const processAutomations = async () => {
    try {
        const { data: { automations } } = await axios.get("http://localhost:3000/automation/get");

        // Loop through each automation
        for (const automation of automations) {
            let allConditionsMet = true;

            // Check if any trigger meets its condition
            const triggerConditionsMet = automation.triggers.some(trigger => {
                const entity = trigger.state; // Assuming this is the actual state of the entity
                return trigger.conditionState === entity; // Check boolean state
            });

            // If no trigger conditions are met, check the conditions
           
                for (const condition of automation.conditions) {
                    const entity = condition.state; // Assuming this is the actual state of the entity

                    // Handle boolean and string state types
                    if (condition.stateType === "boolean") {
                        // Check boolean condition
                        // if(!(conditionState===state)){
                        //     allConditionsMet = false;
                        //     console.log("Boolean condition not met:", condition);
                        //     break;
                        // }
                        if (condition.conditionState !== entity) {
                            allConditionsMet = false;
                            console.log("Boolean condition not met:", condition);
                            break;
                        }
                    } else if (condition.stateType === "string") {
                        // Check if state is within above and below values
                        const stateValue = parseFloat(entity);
                        const aboveValue = parseFloat(condition.above);
                        const belowValue = parseFloat(condition.below);
                        
                        if (!(aboveValue <= stateValue && stateValue <= belowValue)) {
                            allConditionsMet = false;
                            console.log("String condition not met:", condition);
                            break;
                        }
                    }
                }
            

            // If all conditions are met, execute the actions
            if (allConditionsMet) {
                for (const action of automation.actions) {
                    const deviceIp = action.deviceIp.ip;
                    const domain = action.domain;
                    const entityId = action.entityID;

                    // Construct API endpoint based on action condition state
                    const apiEndpoint = `http://${deviceIp}/${domain}/${entityId}/${action.conditionState ? "turn_on" : "turn_off"}`;

                    await makeApiCall(apiEndpoint);
                }
            }
        }
    } catch (error) {
        console.error('Error processing automations:', error);
    }
};

// Function to make an API call
const makeApiCall = async (apiUrl) => {
    try {
        const response = await axios.get(apiUrl);
        console.log('API Response:', response.data);
    } catch (error) {
        console.error('Error calling API:', error);
    }
};
// setInterval(processAutomations, 5000);
module.exports = { saveAutomation, getAutomationDataWithDetails, processAutomations };























// const AutomationModel = require("../models/Automation.model");
// const axios = require('axios');
// // Save automation data to the database
// const saveAutomation = async (req, res) => {
//     try {
//         const automation = new AutomationModel(req.body);
//         await automation.save();
//         res.status(201).json({
//             msg: "Automation saved successfully",
//             automation: automation,
//             status: true,
//         });
//     } catch (err) {  
//         res.status(500).json({
//             msg: "Error saving automation",
//             status: false,
//             error: err.message,
//         });
//     }
// };

// // Retrieve all automation data from the database and get ip from device collection and entityID and domain and state  from Entity collection 

// const getAutomationDataWithDetails = async (req, res) => {
//     try {
//         const automations = await AutomationModel.aggregate([
//             {
//                 $lookup: {
//                     from: "devices",
//                     localField: "triggers.deviceId",
//                     foreignField: "_id",
//                     as: "triggerDevices"
//                 }
//             },
//             {
//                 $lookup: {
//                     from: "devices",
//                     localField: "conditions.deviceId",
//                     foreignField: "_id",
//                     as: "conditionDevices"
//                 }
//             },
//             {
//                 $lookup: {
//                     from: "devices",
//                     localField: "actions.deviceId",
//                     foreignField: "_id",
//                     as: "actionDevices"
//                 }
//             },
//             {
//                 $lookup: {
//                     from: "entities",
//                     localField: "triggers.entity_Id",
//                     foreignField: "_id",
//                     as: "triggerEntities"
//                 }
//             },
//             {
//                 $lookup: {
//                     from: "entities",
//                     localField: "conditions.entity_Id",
//                     foreignField: "_id",
//                     as: "conditionEntities"
//                 }
//             },
//             {
//                 $lookup: {
//                     from: "entities",
//                     localField: "actions.entity_Id",
//                     foreignField: "_id",
//                     as: "actionEntities"
//                 }
//             },
//             {
//                 $project: {
//                     _id: 1,
//                     triggers: {
//                         $map: {
//                             input: "$triggers",
//                             as: "trigger",
//                             in: {
//                                 deviceId: "$$trigger.deviceId",
//                                 entity_Id: "$$trigger.entity_Id",
//                                 conditionState: "$$trigger.conditionState",
//                                 above: "$$trigger.above",
//                                 below: "$$trigger.below",
//                                 deviceIp: {
//                                     $arrayElemAt: [
//                                         {
//                                             $filter: {
//                                                 input: "$triggerDevices",
//                                                 as: "device",
//                                                 cond: { $eq: ["$$device._id", "$$trigger.deviceId"] }
//                                             }
//                                         },
//                                         0
//                                     ]
//                                 },
//                                 entityID: { $arrayElemAt: ["$triggerEntities.entityId", 0] },
//                                 domain: { $arrayElemAt: ["$triggerEntities.domain", 0] },
//                                 state: { $arrayElemAt: ["$triggerEntities.state", 0] },
//                                 stateType: { $arrayElemAt: ["$triggerEntities.stateType", 0] },
//                             }
//                         }
//                     },
//                     conditions: {
//                         $map: {
//                             input: "$conditions",
//                             as: "condition",
//                             in: {
//                                 deviceId: "$$condition.deviceId",
//                                 entity_Id: "$$condition.entity_Id",
//                                 conditionState: "$$condition.conditionState",
//                                 above: "$$condition.above",
//                                 below: "$$condition.below",
//                                 deviceIp: {
//                                     $arrayElemAt: [
//                                         {
//                                             $filter: {
//                                                 input: "$conditionDevices",
//                                                 as: "device",
//                                                 cond: { $eq: ["$$device._id", "$$condition.deviceId"] }
//                                             }
//                                         },
//                                         0
//                                     ]
//                                 },
//                                 entityID: { $arrayElemAt: ["$conditionEntities.entityId", 0] },
//                                 domain: { $arrayElemAt: ["$conditionEntities.domain", 0] },
//                                 state: { $arrayElemAt: ["$conditionEntities.state", 0] },
//                                 stateType: { $arrayElemAt: ["$conditionEntities.stateType", 0] },
//                             }
//                         }
//                     },
//                     actions: {
//                         $map: {
//                             input: "$actions",
//                             as: "action",
//                             in: {
//                                 deviceId: "$$action.deviceId",
//                                 entity_Id: "$$action.entity_Id",
//                                 conditionState: "$$action.conditionState",
//                                 deviceIp: {
//                                     $arrayElemAt: [
//                                         {
//                                             $filter: {
//                                                 input: "$actionDevices",
//                                                 as: "device",
//                                                 cond: { $eq: ["$$device._id", "$$action.deviceId"] }
//                                             }
//                                         },
//                                         0
//                                     ]
//                                 },
//                                 entityID: { $arrayElemAt: ["$actionEntities.entityId", 0] },
//                                 domain: { $arrayElemAt: ["$actionEntities.domain", 0] },
//                                 state: { $arrayElemAt: ["$actionEntities.state", 0] },
//                                 stateType: { $arrayElemAt: ["$actionEntities.stateType", 0] },
//                             }
//                         }
//                     }
//                 }
//             }
//         ]);

//         res.status(200).json({
//             msg: "Automation data retrieved successfully",
//             status: true,
//             automations: automations,
//         });
//     } catch (err) {
//         res.status(500).json({
//             msg: "Error retrieving automation data",
//             status: false,
//             error: err.message,
//         });
//     }
// };

// const Automations= async ()=> {
//     try {
//       const response = await axios.get("http://localhost:3000/automation/get");
//       console.log('API Response:', response.automations);
//     } catch (error) {
//       console.error('Error calling API:', error);
//     }
//   }

// for each automation in automations:
//   allConditionsMet = true
//   for each condition in automation.conditions:
//     entity = findEntityById(condition.entity_Id)
//     device = findDeviceById(condition.deviceId)
    
//     if condition.above and condition.below:
//       // Check if the state value is within the required range
//       if !(condition.above <= entity.state <= condition.below):
//         allConditionsMet = false
//         break
//     else:
//       // Boolean condition check
//       if condition.conditionState != entity.state:
//         allConditionsMet = false
//         break
        
//   if allConditionsMet:
//     for each action in automation.actions:
//       deviceIp = action.deviceIp.ip
//       domain = action.domain
//       entityId = action.entityID
      
//       if action.conditionState:
//         apiEndpoint = `http://${deviceIp}/${domain}/${entityId}/turn_on`
//       else:
//         apiEndpoint = `http://${deviceIp}/${domain}/${entityId}/turn_off`
      
//       // Make the REST API call
//       makeApiCall(apiEndpoint)
      

//       async function makeApiCall(apiUrl) {
//         try {
//           const response = await axios.get(apiUrl);
//           console.log('API Response:', response.data);
//         } catch (error) {
//           console.error('Error calling API:', error);
//         }
//       }
      

// module.exports = {saveAutomation,getAutomationDataWithDetails};
