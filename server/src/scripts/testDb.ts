import dns from 'dns';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Set public DNS servers to prevent Windows querySrv ECONNREFUSED issues
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // fallback to system DNS if custom servers fail
}

// Import all models to ensure schemas are registered
import '../models';

async function testMongoConnection() {
  console.log('\n' + '='.repeat(65));
  console.log('🍃 ReadEase MongoDB Connection Diagnostic Tool');
  console.log('='.repeat(65));

  const maskedUri = env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  console.log(`\n📍 Target URI:      ${maskedUri}`);
  console.log(`📁 Database Name:   ${env.MONGODB_DATABASE_NAME}`);
  console.log(`⏱️  Timeout Limit:   ${env.MONGODB_CONNECT_TIMEOUT_MS}ms\n`);

  const startTime = Date.now();

  try {
    console.log('⏳ Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DATABASE_NAME,
      serverSelectionTimeoutMS: env.MONGODB_CONNECT_TIMEOUT_MS
    });

    const elapsed = Date.now() - startTime;
    console.log(`\n✅ MongoDB Connection Successful! (Latency: ${elapsed}ms)`);

    if (mongoose.connection.db) {
      const pingResult = await mongoose.connection.db.admin().ping();
      console.log(`📡 Ping Result:     `, pingResult);

      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`📊 Collections Found (${collections.length}):`);
      if (collections.length === 0) {
        console.log('   (Empty database - schemas will auto-initialize on first write)');
      } else {
        collections.forEach((c) => console.log(`   • ${c.name}`));
      }
    }

    const registeredModels = mongoose.modelNames();
    console.log(`\n📦 Mongoose Models Ready (${registeredModels.length}):`);
    registeredModels.forEach((m) => console.log(`   ✓ ${m}`));

    console.log('\n🎉 Your database is fully configured and ready for ReadEase!\n');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error(`\n❌ MongoDB Connection Failed after ${elapsed}ms!`);
    console.error(`\nError Details:\n  ${error?.message || error}`);

    console.log('\n💡 Troubleshooting Tips:');
    if (env.MONGODB_URI.includes('mongodb+srv://') || env.MONGODB_URI.includes('cluster')) {
      console.log(
        '  1. [Atlas IP Whitelist]: Ensure your IP address (or 0.0.0.0/0 for dev) is added in MongoDB Atlas -> Network Access.'
      );
      console.log(
        '  2. [Database User]: Verify your database username & password in MongoDB Atlas -> Database Access.'
      );
      console.log(
        '  3. [Special Characters]: If your password has special symbols (e.g. @, #, %), URL-encode them.'
      );
    } else {
      console.log(
        '  1. [Local MongoDB]: Ensure MongoDB Community Server is installed and running.'
      );
      console.log(
        '     Run: net start MongoDB (Windows) or brew services start mongodb/brew/mongodb-community (macOS).'
      );
    }
    console.log(
      '  4. [Environment File]: Check server/.env or root .env to ensure MONGODB_URI is correctly set.\n'
    );

    process.exit(1);
  }
}

testMongoConnection();
