import { config, isProduction, origin } from "./config/env";
import { createApp } from "./app/create_app";

const PORT = config.port || 8080;
const { app } = createApp();

const server = app.listen(PORT, () => {
    console.log("GitVulSafe server started successfully!");
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(
        `Security: ${isProduction ? "Production mode (strict)" : "Development mode (permissive)"}`,
    );
    console.log(`Logging: ${isProduction ? "Production (errors only)" : "Development (verbose)"}`);
    console.log(`Started at: ${new Date().toISOString()}`);

    if (isProduction) {
        console.log(`CORS origin: ${origin}`);
        console.log("Trust proxy: enabled");
    } else {
        console.log("CORS: allowing all origins (development)");
    }
});

process.on("SIGINT", () => {
    console.log("Shutting down...");
    server.close(() => {
        console.log("Server closed.");
        process.exit(0);
    });
});

process.on("SIGTERM", () => {
    console.log("Shutting down...");
    server.close(() => {
        console.log("Server closed.");
        process.exit(0);
    });
});
