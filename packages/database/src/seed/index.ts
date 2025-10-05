import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { seedAqStations } from "./aq-stations";
import { seedAqiMeasurements } from "./aqi-measurements";

const main = async () => {
    config({ path: process.cwd() + "/.dev.vars", override: true });

    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is not defined");
    }

    const client = postgres(process.env.DATABASE_URL as string, {
        max: 1,
        prepare: false,
    });

    const db = drizzle(client);

    // Seed stations first
    await seedAqStations(db);

    // Seed measurements (optional - populated in runtime via predecirAqi)
    await seedAqiMeasurements(db);

    await client.end();
}

main().then(() => {
    console.log("success")
    process.exit(0);
}).catch((e) => {
    console.log(e)
    process.exit(1);
})