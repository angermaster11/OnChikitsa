import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database';

// Connect once (env.MONGODB_URI points at the in-memory server from globalSetup).
beforeAll(async () => {
  await connectDatabase();
});

// Isolate every test: wipe all collections between tests.
afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await disconnectDatabase();
});
