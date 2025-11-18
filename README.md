# IoT Backend System

A comprehensive backend system for managing IoT devices, energy monitoring, automation, and real-time data processing.

## 🚀 Features

### Core Functionality
- **Device & Entity Management**: Manage IoT devices and their entities (sensors, actuators)
- **Real-time Communication**: MQTT integration for IoT device communication
- **WebSocket Support**: Real-time updates via Socket.IO
- **User Authentication**: JWT-based authentication system
- **Energy Monitoring**: Comprehensive energy meter data collection and aggregation
- **Automation**: Rule-based automation for IoT devices
- **Air Conditioner Control**: AC unit management and monitoring
- **Water Management System (WMS)**: Water flow monitoring and motor control

### Energy Aggregation System
- **Hourly Aggregation**: Automatic hourly energy consumption calculation
- **Daily Aggregation**: Daily energy summaries
- **Monthly Aggregation**: Monthly energy reports
- **Yearly Aggregation**: Annual energy statistics
- **Accurate Calculations**: Handles meter resets and missing data gracefully

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB database
- MQTT broker (for IoT device communication)
- Environment variables configured (see `.env` setup)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd iot-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   MONGO_URI=mongodb://localhost:27017/iot-db
   PORT=5000
   JWT_SECRET=your-secret-key
   MQTT_BROKER_URL=mqtt://your-mqtt-broker:1883
   MQTT_USERNAME=your-mqtt-username
   MQTT_PASSWORD=your-mqtt-password
   ```

4. **Start the server**
   ```bash
   npm start
   # or for development with auto-reload
   nodemon index.js
   ```

## 📁 Project Structure

```
iot-backend/
├── controllers/          # Request handlers
│   ├── device.controller.js
│   ├── entity.controller.js
│   ├── energyHistory.controller.js
│   ├── airConditioner.controller.js
│   ├── automation.controller.js
│   └── wms.controller.js
├── models/               # MongoDB models
│   ├── Device.model.js
│   ├── entity.model.js
│   ├── energyMeterModels/
│   │   ├── energyHourly.model.js
│   │   ├── energyDaily.model.js
│   │   ├── energyMonthly.model.js
│   │   └── energyYearly.model.js
│   └── ...
├── routes/              # API routes
│   ├── devices.route.js
│   ├── entity.route.js
│   ├── history.route.js
│   └── ...
├── DbScheduling/        # Scheduled tasks
│   ├── energyAggregator.js
│   └── testEnergyCalculations.js
├── services/            # Business logic services
│   ├── mqttSubscriptionService.js
│   └── acHistoricData.js
├── middleware/          # Express middleware
│   └── auth.js
├── mqtt/               # MQTT client configuration
│   └── mqttClient.js
├── db/                 # Database connection
│   └── connect.js
└── index.js            # Application entry point
```

## ⏰ Scheduled Tasks

The system includes automated scheduled tasks for energy data aggregation:

- **Hourly Aggregation**: Runs at minute 1 of every hour
- **Daily Aggregation**: Runs at 00:01 AM daily
- **Monthly Aggregation**: Runs at 00:20 AM daily
- **Yearly Aggregation**: Runs at 00:30 AM daily

These tasks automatically calculate:
- `totalValue`: Energy consumption during the period
- `totalEnergyConsumption`: Cumulative meter reading at end of period

## 🧪 Testing

### Energy Calculation Tests

Run comprehensive tests to verify energy aggregation calculations:

```bash
npm run test:energy
```

This will test:
- ✅ Hourly calculations accuracy
- ✅ Daily aggregation sums
- ✅ Monthly aggregation sums
- ✅ Yearly aggregation sums
- ✅ Data consistency
- ✅ Edge cases (meter resets, missing data)

## 🔧 Configuration

### MongoDB Connection

The system supports multiple MongoDB connection methods:

1. **Direct URI** (recommended):
   ```env
   MONGO_URI=mongodb://username:password@host:port/database
   ```

2. **Environment Variables**:
   ```env
   MONGO_HOST=localhost
   MONGO_PORT=27017
   MONGO_DB=iot-db
   MONGO_USER=username
   MONGO_PASSWORD=password
   ```

### MQTT Configuration

Configure MQTT broker connection:
```env
MQTT_BROKER_URL=mqtt://broker-url:1883
MQTT_USERNAME=your-username
MQTT_PASSWORD=your-password
```

## 📊 Energy Aggregation Details

### Calculation Logic

**Hourly:**
- `totalValue` = Current hour's last reading - Previous hour's last reading
- `totalEnergyConsumption` = Last raw reading of the hour

**Daily:**
- `totalValue` = Sum of all hourly `totalValue` for the day
- `totalEnergyConsumption` = Last hour (23:00) of the day's `totalEnergyConsumption`

**Monthly:**
- `totalValue` = Sum of all daily `totalValue` for the month
- `totalEnergyConsumption` = Last day of the month's `totalEnergyConsumption`

**Yearly:**
- `totalValue` = Sum of all monthly `totalValue` for the year
- `totalEnergyConsumption` = December's `totalEnergyConsumption`

### Features
- ✅ Handles meter resets automatically
- ✅ Falls back to raw history if aggregated data unavailable
- ✅ Validates all calculations
- ✅ Prevents negative consumption values

## 🐳 Docker Support

The project includes Docker configuration:

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build Docker image
docker build -t iot-backend .
docker run -p 5000:5000 iot-backend
```

## 🔐 Security

- JWT-based authentication
- Password hashing with bcrypt
- CORS configuration
- Input validation
- Protected routes with middleware

## 📝 Environment Variables

Required environment variables:

```env
# Database
MONGO_URI=mongodb://localhost:27017/iot-db

# Server
PORT=5000

# Authentication
JWT_SECRET=your-secret-key-here

# MQTT
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=your-username
MQTT_PASSWORD=your-password
```

### Manual Deployment

1. Set environment variables on your hosting platform
2. Install dependencies: `npm install --production`
3. Start the server: `npm start`

## 📚 Additional Documentation

- **Energy Aggregation**: See `DbScheduling/energyAggregator.js` for detailed aggregation logic
- **Testing Guide**: Run `npm run test:energy` and review test output
- **API Documentation**: Check individual route files in `routes/` directory

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test:energy`
5. Submit a pull request

## 📄 License

See `LICENSE` file for details.

## 👥 Authors

- **Ahmad** - Initial work

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check `MONGO_URI` in `.env`
   - Verify MongoDB is running
   - Check network connectivity

2. **MQTT Connection Issues**
   - Verify MQTT broker URL and credentials
   - Check firewall settings
   - Ensure MQTT broker is accessible

3. **Energy Calculations Incorrect**
   - Run tests: `npm run test:energy`
   - Check aggregation logs
   - Verify raw data exists in database

4. **WebSocket Not Working**
   - Check CORS configuration
   - Verify Socket.IO client connection
   - Check server logs for errors

## 📞 Support

For issues and questions, please open an issue on the repository.

---

**Version**: 1.0.0  
