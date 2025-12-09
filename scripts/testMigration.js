// Simple test to check if models load
import mongoose from 'mongoose';
import config from '../config/environment.js';

console.log('🧪 Testing migration setup...');

try {
  console.log('1. Loading Todo model...');
  const Todo = await import('../models/Todo.js');
  console.log('✅ Todo model loaded');
  
  console.log('2. Loading StructuredTodo model...');
  const StructuredTodo = await import('../models/StructuredTodo.js');
  console.log('✅ StructuredTodo model loaded');
  
  console.log('3. Testing database connection...');
  await mongoose.connect(config.MONGODB_URI);
  console.log('✅ Database connected');
  
  console.log('4. Counting existing todos...');
  const todoCount = await Todo.default.countDocuments();
  console.log(`✅ Found ${todoCount} existing todos`);
  
  await mongoose.disconnect();
  console.log('🎉 All tests passed!');
  
} catch (error) {
  console.error('❌ Test failed:', error);
}