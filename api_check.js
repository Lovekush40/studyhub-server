import axios from 'axios';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000/api/v1';

async function test() {
  try {
    const courses = await axios.get(`${BASE_URL}/courses`);
    const batches = await axios.get(`${BASE_URL}/batches`);
    
    const output = {
        courses: courses.data.data ? courses.data.data.slice(0, 2) : courses.data.slice(0,2),
        batches: batches.data.data ? batches.data.data.slice(0, 2) : batches.data.slice(0,2)
    };
    
    fs.writeFileSync('api_check.json', JSON.stringify(output, null, 2));
    console.log('✅ API Check saved');
  } catch (err) {
    console.error('❌ API Check failed:', err.message);
    fs.writeFileSync('api_check_error.txt', err.message + '\n' + (err.response ? JSON.stringify(err.response.data) : ''));
  }
}

test();
