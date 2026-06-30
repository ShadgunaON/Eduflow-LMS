const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace backend array roles
  content = content.replace(/\["ADMIN", "INSTRUCTOR", "TUTOR"\]/g, '["ADMIN", "TUTOR"]');
  content = content.replace(/\["ADMIN", "INSTRUCTOR"\]/g, '["ADMIN", "TUTOR"]');
  
  // Frontend/api array roles
  content = content.replace(/ROLES\.INSTRUCTOR,\s*/g, '');
  content = content.replace(/INSTRUCTOR:\s*"INSTRUCTOR",/g, '');
  
  fs.writeFileSync(filePath, content, 'utf8');
}

const files = [
  'app/api/courses/upload/route.ts',
  'backend/src/handlers/assignments.js',
  'backend/src/handlers/courses.js',
  'backend/src/handlers/enrollments.js',
  'backend/src/handlers/quizzes.js',
  'backend/src/handlers/students.js',
  'app/components/RoleGuard.tsx',
  'app/components/sidebar.tsx',
  'lib/rbac.ts'
];

files.forEach(f => {
  const p = path.join(__dirname, f);
  if (fs.existsSync(p)) {
    replaceInFile(p);
    console.log(`Updated ${f}`);
  } else {
    console.log(`Missing ${f}`);
  }
});
