# Debug: Admin Cannot See Students

## ✅ Issues Found & Fixed:

1. **Fixed populate logic** - Simplified nested populate to prevent missing data
2. **Added console logs** - Now logs role, query, and student count

## 📋 Things to Check:

### 1. Verify Admin Status
```
- Email logged in: l.kprajapati9611@gmail.com 
- Check token has role: "ADMIN"
- Open DevTools → Network → Check Authorization header has Bearer token
```

### 2. Check Database for Students
```mongodb
// In MongoDB Atlas, run:
db.students.countDocuments();  // How many students exist?
db.students.find().limit(5);   // Show sample students
```

### 3. Check Server Logs
- When you access /api/v1/students, you should see console logs:
  ```
  🔍 getStudents - User Role: ADMIN  
  📊 Student Query: {}
  ✅ Students found: X
  ```

### 4. Test API Directly
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/v1/students
```

## 🔧 Options:

**Option A: If no students exist in database**
- Use the student creation API to add students
- OR check if students were created with wrong batch_id/course_id

**Option B: If admin role is not set**
- Re-register with: l.kprajapati9611@gmail.com
- Or create admin via createTeacher endpoint

**Option C: Restart server**
```bash
npm start
```

Then check browser console for the debug logs above.
