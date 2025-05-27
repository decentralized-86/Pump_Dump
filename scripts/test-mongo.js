const mongoose = require('mongoose');

// Replace this with your actual connection string
const MONGO_URL = 'mongodb+srv://poonampradeepyadav999:W4VyFthweQI1hVRm@cluster0.ckizrzq.mongodb.net/';

async function testConnection() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Successfully connected to MongoDB!');
        
        // Create a simple test document
        const Test = mongoose.model('Test', new mongoose.Schema({
            message: String,
            createdAt: { type: Date, default: Date.now }
        }));
        
        await Test.create({ message: 'Test connection successful!' });
        console.log('Successfully created test document!');
        
        const count = await Test.countDocuments();
        console.log(`Number of test documents: ${count}`);
        
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

testConnection(); 