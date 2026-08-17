import app from "./app.js";
import { connectDB } from "./config/database.js";
import { env } from "./config/env.js";

const startServer = async () => {
    try {
        await connectDB();

        app.listen(env.PORT, () => {
            console.log(`Server running on port ${env.PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

if (env.NODE_ENV === "development") {
    startServer();
}

export default app;