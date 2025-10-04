/* eslint-disable no-console */
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const MIGRATION_TIMEOUT = 120000; // 2 minutes (increased from 30s)

const getClient = () => {
  console.log("🔧 Setting up database connection...");
  config({ path: process.cwd() + "/.dev.vars", override: true });

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is not defined");
    throw new Error("DATABASE_URL is not defined");
  }

  console.log("📡 Connecting to database...");
  console.log(
    "📍 Database URL:",
    process.env.DATABASE_URL.replace(/\/\/.*@/, "//***:***@")
  ); // Hide credentials in logs

  const migrationClient = postgres(process.env.DATABASE_URL as string, {
    max: 1,
    prepare: false,
    connection: {
      application_name: "migration-script",
    },
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: (notice) => {
      console.log("📢 Database notice:", notice.message);
    },
  });

  return migrationClient;
};

const getMigrationFolder = () => {
  const rootProjectFolder = process.cwd();
  const migrationsFolder = rootProjectFolder + "/src/migrations";
  console.log("📁 Migrations folder:", migrationsFolder);
  return migrationsFolder;
};

const checkMigrationStatus = async (client: postgres.Sql) => {
  try {
    console.log("🔍 Checking existing migrations...");
    const result = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'drizzle' 
        AND table_name = 'migrations'
      ) as table_exists
    `;

    if (result[0]?.table_exists) {
      // First check what columns exist in the migrations table
      const columns = await client`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'drizzle' 
        AND table_name = 'migrations'
        ORDER BY ordinal_position
      `;

      console.log(
        "📋 Migrations table columns:",
        columns.map((c) => c.column_name).join(", ")
      );

      // Try to get migration info based on available columns
      try {
        const migrations = await client`
          SELECT * 
          FROM drizzle.migrations 
          ORDER BY created_at DESC 
          LIMIT 5
        `;
        console.log("📋 Recent migrations:", migrations.length);
        migrations.forEach((migration, index) => {
          console.log(`   ${index + 1}. ${JSON.stringify(migration)}`);
        });
      } catch (selectError) {
        console.log(
          "⚠️  Could not select migrations:",
          selectError instanceof Error ? selectError.message : selectError
        );
        // Try a simpler query
        const count =
          await client`SELECT COUNT(*) as count FROM drizzle.migrations`;
        console.log("📋 Total migrations in table:", count[0]?.count || 0);
      }
    } else {
      console.log(
        "📋 No migrations table found - this will be the first migration"
      );
    }
  } catch (error) {
    console.log(
      "⚠️  Could not check migration status:",
      error instanceof Error ? error.message : error
    );
  }
};

const checkForPendingMigrations = async (migrationsFolder: string) => {
  try {
    const fs = await import("fs");
    const path = await import("path");

    if (!fs.existsSync(migrationsFolder)) {
      console.log("📁 Migrations folder does not exist");
      return false;
    }

    const files = fs.readdirSync(migrationsFolder);
    const migrationFiles = files.filter((file) => file.endsWith(".sql"));

    console.log("📄 Migration files found:", migrationFiles.length);
    migrationFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });

    return migrationFiles.length > 0;
  } catch (error) {
    console.log(
      "⚠️  Could not check migration files:",
      error instanceof Error ? error.message : error
    );
    return true; // Assume there might be migrations if we can't check
  }
};

const main = async () => {
  const startTime = Date.now();
  console.log("🚀 Starting migration process...");
  console.log("⏰ Start time:", new Date().toISOString());

  let client;

  try {
    client = getClient();
    const migrationsFolder = getMigrationFolder();

    // Test database connection
    console.log("🔌 Testing database connection...");
    await client`SELECT 1 as test`;
    console.log("✅ Database connection successful");

    // Check current migration status
    await checkMigrationStatus(client);

    // Check if there are pending migrations
    const hasPendingMigrations =
      await checkForPendingMigrations(migrationsFolder);

    if (!hasPendingMigrations) {
      console.log("✅ No migration files found - nothing to migrate");
      console.log("🔌 Closing database connection...");
      await client.end();
      console.log("✅ Database connection closed successfully");
      process.exit(0);
    }

    console.log("📋 Starting migration process...");
    console.log(`⏱️  Timeout set to: ${MIGRATION_TIMEOUT / 1000}s`);

    const db = drizzle(client);

    // Create a progress tracker
    let migrationStarted = false;
    const progressInterval = setInterval(() => {
      if (migrationStarted) {
        const elapsed = Date.now() - startTime;
        console.log(
          `⏳ Migration in progress... (${Math.floor(elapsed / 1000)}s elapsed)`
        );
      }
    }, 10000); // Log every 10 seconds

    // Set up timeout with better error message
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        clearInterval(progressInterval);
        reject(
          new Error(
            `Migration timeout after ${MIGRATION_TIMEOUT / 1000}s. This might indicate a hanging migration or database lock.`
          )
        );
      }, MIGRATION_TIMEOUT);
    });

    try {
      migrationStarted = true;
      console.log("🔄 Executing migrations...");

      const migrationPromise = migrate(db, {
        migrationsFolder,
        migrationsTable: "migrations",
      });

      await Promise.race([migrationPromise, timeoutPromise]);
      clearInterval(progressInterval);
    } catch (migrationError) {
      clearInterval(progressInterval);
      throw migrationError;
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log("✅ Migrations completed successfully!");
    console.log(
      "⏱️  Duration:",
      `${duration}ms (${(duration / 1000).toFixed(2)}s)`
    );
    console.log("🕐 End time:", new Date().toISOString());

    // Final status check
    await checkMigrationStatus(client);

    console.log("🔌 Closing database connection...");
    await client.end();
    console.log("✅ Database connection closed successfully");

    process.exit(0);
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.error("❌ Migration failed!");
    console.error(
      "⏱️  Failed after:",
      `${duration}ms (${(duration / 1000).toFixed(2)}s)`
    );
    console.error("🕐 Failure time:", new Date().toISOString());

    if (error instanceof Error) {
      console.error("📝 Error message:", error.message);
      if (error.message.includes("timeout")) {
        console.error("💡 Timeout suggestions:");
        console.error(
          "   - Check if there are long-running transactions blocking the migration"
        );
        console.error("   - Verify database connectivity and performance");
        console.error(
          "   - Consider running migrations during low-traffic periods"
        );
        console.error(
          "   - Check for database locks: SELECT * FROM pg_locks WHERE NOT granted;"
        );
      }
      console.error("📍 Error stack:", error.stack);
    } else {
      console.error("📝 Unknown error:", error);
    }

    // Ensure database connection is closed even on error
    if (client) {
      try {
        console.log("🔌 Attempting to close database connection...");
        await client.end();
        console.log("✅ Database connection closed after error");
      } catch (closeError) {
        console.error("⚠️  Failed to close database connection:", closeError);
      }
    }

    process.exit(1);
  }
};

main().catch((e) => {
  console.error("💥 Unhandled error in main process:");
  console.error(e);
  process.exit(1);
});
