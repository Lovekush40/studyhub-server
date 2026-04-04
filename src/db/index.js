import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'studyhub';
  
  console.log(`🔗 Connecting to MongoDB: ${uri.split('@').pop()}...`);
  
  try {
    const connection = await mongoose.connect(`${uri}/${dbName}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000 
    });
    
    console.log(`✅ MongoDB connected: ${connection.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};
