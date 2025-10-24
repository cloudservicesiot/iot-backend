This file contains recommended connection code and instructions for running the app with Docker Compose.

1) Recommended Mongoose connection (place in your DB connect code, e.g., `db/connect.js`):

```js
// Example resilient Mongoose connection
const mongoose = require('mongoose');

const getMongoUri = () => {
  if (process.env.MONGO_URI && process.env.MONGO_URI.trim() !== '') return process.env.MONGO_URI;
  const user = encodeURIComponent(process.env.MONGO_USER || '');
  const pass = encodeURIComponent(process.env.MONGO_PASSWORD || '');
  const host = process.env.MONGO_HOST || 'localhost';
  const port = process.env.MONGO_PORT || '27017';
  const db = process.env.MONGO_DB || 'test';
  const auth = user && pass ? `${user}:${pass}@` : '';
  const authSource = user && pass ? '?authSource=admin' : '';
  return `mongodb://${auth}${host}:${port}/${db}${authSource}`;
};

const connectWithRetry = async (retries = 0) => {
  try {
    const uri = getMongoUri();
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error(`MongoDB connection error (attempt ${retries}):`, err.message);
    const delay = Math.min(30000, 2000 + retries * 2000);
    setTimeout(() => connectWithRetry(retries + 1), delay);
  }
};

module.exports = { connectWithRetry };

// In your app startup:
// const { connectWithRetry } = require('./path/to/this/file');
// connectWithRetry();
```

Notes:
- The retry logic ensures the Node app keeps attempting to reconnect if MongoDB restarts or is not yet ready at container startup.
- Use environment variables provided in `docker-compose.yml` or a `MONGO_URI` override.

2) Build & run instructions (PowerShell / Windows with Docker Desktop using WSL2):

- Create the host data folder for MongoDB (PowerShell):

```powershell
New-Item -ItemType Directory -Force -Path 'D:\iot-server\mongo-data'
```

- Copy `.env.example` to `.env` and edit values as needed (set secure password):

```powershell
Copy-Item .env.example .env -Force
# Then edit .env with your preferred editor
```

- Build and start the stack (powershell):

```powershell
docker compose up --build -d
```

- View logs:

```powershell
docker compose logs -f
```

- To stop and remove containers:

```powershell
docker compose down
```

3) Production notes:
- The Dockerfile uses a production Node image and runs as a non-root user.
- `restart: unless-stopped` for `mongo` and `on-failure` for `app` provide basic resilience. Consider `restart: always` for the app if you want it to always run.
- Use a managed secret store for credentials in production (Docker secrets, environment variables injected by platform, or a vault).
- Consider enabling MongoDB authentication, TLS, and backups for production.


4) Named volume default and verification steps

We now use a Docker named volume `mongo_data` (managed by Docker) for MongoDB data by default. This avoids Windows host bind-permission issues and usually performs better.

- Check MongoDB data in the named volume (quick verification):
  - Stop the compose stack: `docker compose down`
  - List volumes: `docker volume ls`
  - Inspect volume contents by running a short container that mounts it:

```powershell
docker run --rm -it -v iot-backend_mongo_data:/data/db alpine sh -c "ls -la /data/db"
```

Note: The actual volume name may be prefixed by the compose project name (for example `iot-backend_mongo_data`). Use `docker volume ls` to confirm.

- Connect from the host (mongo shell) if you have it installed (while the stack is running):

```powershell
docker compose exec mongo mongo -u $env:MONGO_ROOT_USERNAME -p $env:MONGO_ROOT_PASSWORD --authenticationDatabase admin
```

5) Backing up the named volume to a host folder (optional)

If you still want copies on `D:` for backups or visibility, the easiest approach is to run a temporary container that mounts both the named volume and a host folder, and then copies files between them.

- Example: copy from named volume to host path defined in your `.env` as `MONGO_HOST_DATA_PATH` (PowerShell):

```powershell
# Ensure host backup folder exists (example path from your .env.example)
New-Item -ItemType Directory -Force -Path 'D:\iot-database-server\mongo-data'

# Run a one-shot container that mounts the named volume and the host folder, then copies files
docker run --rm \
  -v iot-backend_mongo_data:/data/db \
  -v ${env:MONGO_HOST_DATA_PATH}:/backup-host \
  alpine sh -c "cp -a /data/db /backup-host/"
```

Notes:
- Replace `iot-backend_mongo_data` with the volume name you see in `docker volume ls` if different.
- The `alpine` image is used for a lightweight copy; you can replace with `busybox` or `ubuntu` if you prefer.
- Ensure Docker Desktop has permissions to write to the host folder (D:). If you run into permission errors, run PowerShell as an elevated user or use a WSL path.

6) Troubleshooting hints:
- If the `mongo` container fails to start because of permission issues on Windows host mount, using the named volume removes that class of problem.
- If your app can't connect to MongoDB but `mongo` is healthy, ensure the app uses `mongo` as host (service name in compose) and not `localhost`.

7) Handling TLS certificates (recommended)

- `.dockerignore` intentionally excludes the `certs` folder so you don't commit private keys. Instead mount the host `certs` directory into the app container (read-only). The `docker-compose.yml` already contains:

```yaml
services:
  app:
    volumes:
      - ./certs:/usr/src/app/certs:ro
```

- Steps to provide certificates on the host (PowerShell):

```powershell
# Create the certs folder (if not present)
New-Item -ItemType Directory -Force -Path '.\certs'

# Copy or place your private.key, certificate.crt and ca_bundle.crt into the folder
```

- The container will read certs from `/usr/src/app/certs` inside the app. Keep the host `certs` folder out of version control and secure it with appropriate file permissions.


5) Troubleshooting hints:
- If the `mongo` container fails to start because of permission issues on Windows host mount, try using a WSL path or configure Docker Desktop to share the drive and enable file sharing for D:.
- If your app can't connect to MongoDB but `mongo` is healthy, ensure the app uses `mongo` as host (service name in compose) and not `localhost`.
